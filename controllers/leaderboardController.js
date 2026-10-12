const UserSport = require("../models/userSport");
const mongoose = require("mongoose");

const getLeaderboard = async (req, res) => {
  try {
    const { sportId } = req.params;

    if (!mongoose.isValidObjectId(sportId)) {
      return res.status(400).json({ message: "Invalid sport ID" });
    }

    const leaderboard = await UserSport.find({ sportId })
      .sort({ currentRating: -1 })
      .populate("userId", "name firstName lastName");

    const ranked = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player.toObject(),
    }));

    res.status(200).json(ranked);
  } catch (error) {
    console.error("❌ Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getLeaderboard };