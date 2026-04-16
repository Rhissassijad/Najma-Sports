const express = require("express");
const router = express.Router();
const { getLeaderboard } = require("../controllers/leaderboardController");

router.get("/:sportId", getLeaderboard);

module.exports = router;