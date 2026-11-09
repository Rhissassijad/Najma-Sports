const { resolve } = require("../utils/individualSports");
const { isTeamSport } = require("../utils/sports");
const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const RatingHistory = require("../models/RatingHistory");
const User = require("../models/User");
const UserSport = require("../models/userSport");
const Match = require("../models/Match");
const Sport = require("../models/Sport");
const mongoose = require("mongoose");
const enrichMatches = require("../utils/enrichMatches");

router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    const [ratings, recentMatches, upcomingMatches, ratingHistory] =
      await Promise.all([
        UserSport.find({ userId })
          .populate("sportId")
          .sort({ currentRating: -1 }),
        Match.find({
          players: userId,
          $or: [
            { status: "completed" },
            { status: { $exists: false }, score: { $ne: null } },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("players", "name firstName lastName")
          .populate("sport", "name"),
        Match.find({
          players: userId,
          $or: [
            {
              status: {
                $in: ["open", "awaiting_result", "awaiting_confirmation"],
              },
            },
            { status: { $exists: false }, score: null },
          ],
        })
          .sort({ createdAt: -1 })
          .populate("players", "name firstName lastName")
          .populate("sport", "name"),
        RatingHistory.find({ userId })
          .sort({ createdAt: 1 })
          .populate("sportId", "name"),
      ]);

    const [enrichedRecentMatches, enrichedUpcomingMatches] = await Promise.all([
      enrichMatches(recentMatches),
      enrichMatches(upcomingMatches),
    ]);

    res.json({
      user,
      followingIds: (user?.following || []).map(String),
      followersCount: user?.followers?.length || 0,
      followingCount: user?.following?.length || 0,
      ratings,
      recentMatches: enrichedRecentMatches,
      upcomingMatches: enrichedUpcomingMatches,
      ratingHistory,
    });
  } catch (error) {
    console.error("GET /api/users/me ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:userId/follow", protect, async (req, res) => {
  const targetId = req.params.userId;
  if (!mongoose.isValidObjectId(targetId))
    return res.status(400).json({ message: "Invalid user ID." });
  if (String(targetId) === String(req.user.id))
    return res.status(400).json({ message: "You cannot follow yourself." });
  if (
    req.body?.following !== undefined &&
    typeof req.body.following !== "boolean"
  )
    return res
      .status(400)
      .json({ message: "Following must be true or false." });
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const current = await User.findById(req.user.id)
        .select("following")
        .session(session);
      const target = await User.findById(targetId)
        .select("followers")
        .session(session);
      if (!current || !target)
        throw Object.assign(new Error("User not found."), { status: 404 });
      const following =
        req.body?.following ??
        !current.following.some((id) => String(id) === String(targetId));
      await User.updateOne(
        { _id: current._id },
        following
          ? { $addToSet: { following: target._id } }
          : { $pull: { following: target._id } },
        { session },
      );
      await User.updateOne(
        { _id: target._id },
        following
          ? { $addToSet: { followers: current._id } }
          : { $pull: { followers: current._id } },
        { session },
      );
      result = { following };
    });
    res.json(result);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        message: error.status
          ? error.message
          : "Could not update following. Check database transaction support and retry.",
      });
  } finally {
    await session.endSession();
  }
});

router.post("/me/sports", protect, async (req, res) => {
  try {
    const { sportId } = req.body;

    if (!sportId || !mongoose.isValidObjectId(sportId)) {
      return res.status(400).json({ message: "A valid sport ID is required" });
    }

    const sport = await Sport.findById(sportId);
    if (!sport) {
      return res.status(404).json({ message: "Sport not found" });
    }

    if (isTeamSport(sport.name))
      return res.status(400).json({
        message:
          "Use the Compete team-sports area to join a squad and build your team-sports profile.",
      });

    const d = resolve(sport.name, req.body.discipline);
    const userSport = await UserSport.findOneAndUpdate(
      { userId: req.user.id, sportId, discipline: d.id },
      { $setOnInsert: { userId: req.user.id, sportId, discipline: d.id } },
      { new: true, upsert: true, runValidators: true },
    ).populate("sportId");

    return res.status(200).json(userSport);
  } catch (error) {
    console.error("Add profile sport error:", error);
    return res
      .status(error.status || 500)
      .json({ message: error.status ? error.message : "Failed to add sport" });
  }
});
router.patch("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const allowedFields = [
      "name",
      "nationality",
      "city",
      "dateOfBirth",
      "height",
      "weight",
      "favoritePlayer",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    const isValidationError =
      error.name === "ValidationError" || error.name === "CastError";
    res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? error.message : "Failed to update profile",
    });
  }
});

module.exports = router;
