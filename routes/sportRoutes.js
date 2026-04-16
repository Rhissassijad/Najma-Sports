const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const Sport = require("../models/Sport");

// CREATE SPORT
router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Sport name is required" });
    }

    const sport = await Sport.create({ name });

    res.status(201).json(sport);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;