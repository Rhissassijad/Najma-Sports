const express = require("express");
const router = express.Router();

const { getUserRatingHistory } = require("../controllers/ratingController");

// ✅ Routes
router.get("/:userId", getUserRatingHistory);
router.get("/:userId/:sportId", getUserRatingHistory);

module.exports = router;