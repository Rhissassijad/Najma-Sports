const Match = require("../models/Match");
const express = require("express");
const router = express.Router();

const { createMatch, getUserMatches } = require("../controllers/matchController");
const protect = require("../middleware/authMiddleware");

// CREATE MATCH
router.post("/", protect, createMatch);

// GET USER MATCHES (OLD - optional keep)
router.get("/user/:userId", protect, getUserMatches);

// ✅ NEW: GET MY MATCHES (RECOMMENDED)
const Rating = require("../models/Rating");

router.get("/my", protect, async (req, res) => {
  try {
    const matches = await Match.find({
      players: { $in: [req.user.id] },
    })
      .populate("players", "name")
      .populate("sport", "name")
      .sort({ createdAt: -1 });

    const ratings = await Rating.find({
      userId: { $in: matches.flatMap(m => m.players.map(p => p._id)) }
    });

    const enriched = matches.map(m => ({
      ...m.toObject(),
      players: m.players.map(p => ({
        ...p.toObject(),
        rating: ratings.find(r => r.userId.toString() === p._id.toString())?.currentRating || 25
      }))
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;