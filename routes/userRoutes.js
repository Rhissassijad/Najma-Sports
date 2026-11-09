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

    if (sport.name.toLowerCase() === "soccer")
      return res
        .status(400)
        .json({
          message:
            "Use the Soccer hub to join a squad and build your soccer profile.",
        });

    const userSport = await UserSport.findOneAndUpdate(
      { userId: req.user.id, sportId },
      { $setOnInsert: { userId: req.user.id, sportId } },
      { new: true, upsert: true, runValidators: true },
    ).populate("sportId");

    return res.status(200).json(userSport);
  } catch (error) {
    console.error("Add profile sport error:", error);
    return res.status(500).json({ message: "Failed to add sport" });
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
