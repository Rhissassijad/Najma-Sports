const UserSport = require("../models/UserSport");

const getLeaderboard = async (req, res) => {
  try {
    const { sportId } = req.params;

    console.log("📊 Fetching leaderboard for sport:", sportId);

    const leaderboard = await UserSport.find({ sportId })
      .sort({ currentRating: -1 })
      .populate("userId", "name email");

    // 🔥 Add ranking position
    const ranked = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player.toObject(),
    }));

    console.log("✅ Leaderboard ready");

    res.status(200).json(ranked);
  } catch (error) {
    console.error("❌ Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getLeaderboard };