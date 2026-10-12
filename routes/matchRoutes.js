const express = require("express");
const router = express.Router();

const {
  createMatch,
  getUserMatches,
  getOpenMatches,
  joinMatch,
  proposeResult,
  confirmResult,
} = require("../controllers/matchController");
const protect = require("../middleware/authMiddleware");

router.get("/open", protect, getOpenMatches);
router.get("/my", protect, getUserMatches);
router.get("/user/:userId", protect, getUserMatches);
router.post("/", protect, createMatch);
router.post("/:matchId/join", protect, joinMatch);
router.post("/:matchId/result", protect, proposeResult);
router.post("/:matchId/confirm-result", protect, confirmResult);

module.exports = router;