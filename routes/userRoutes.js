const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const User = require("../models/User");
const UserSport = require("../models/UserSport");
const Match = require("../models/Match");

router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 👤 Basic user info (KEEP THIS)
    const user = await User.findById(userId).select("-password");

    // 📊 Ratings per sport
    const ratings = await UserSport.find({ userId })
      .populate("sportId");

    // 🎾 Recent matches
    const recentMatches = await Match.find({
      players: userId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("players");

    const upcomingMatches = await Match.find({
      players: userId,
      score: null
    })
        .populate("players");
    
    // 🆕 Rating history
    const ratingHistory = await RatingHistory.find({
      userId
    }).sort({ createdAt: 1 });

    res.json({
      user,
      ratings,
      recentMatches,
      upcomingMatches,
      ratingHistory
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;