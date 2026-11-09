const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const Sport = require("../models/Sport");

router.get("/", async (req, res) => {
  try {
    const sports = await Sport.find().sort({ name: 1 });
    res
      .status(200)
      .json(
        sports.map((s) => ({
          ...s.toObject(),
          category: require("../utils/sports").isTeamSport(s.name)
            ? "team"
            : "individual",
        })),
      );
  } catch (error) {
    console.error("List sports error:", error);
    res.status(500).json({ message: "Failed to retrieve sports" });
  }
});

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
