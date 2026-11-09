const UserSport = require("../models/userSport");
const mongoose = require("mongoose");
const Sport = require("../models/Sport");
const { resolve, scope } = require("../utils/individualSports");

const getLeaderboard = async (req, res) => {
  try {
    const { sportId } = req.params;

    if (!mongoose.isValidObjectId(sportId)) {
      return res.status(400).json({ message: "Invalid sport ID" });
    }

    const sport = await Sport.findById(sportId);
    if (!sport) return res.status(404).json({ message: "Sport not found." });
    const d = resolve(sport.name, req.query.discipline);
    if (d.mode !== "racket") return res.json([]);
    const leaderboard = await UserSport.find({ sportId, ...scope(d.id) })
      .sort({ currentRating: -1 })
      .populate("userId", "name firstName lastName");

    const ranked = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player.toObject(),
    }));

    res.status(200).json(ranked);
  } catch (error) {
    console.error("❌ Leaderboard error:", error);
    res
      .status(error.status || 500)
      .json({ message: error.status ? error.message : "Server error" });
  }
};

module.exports = { getLeaderboard };
