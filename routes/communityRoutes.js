const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getCommunities,
  createCommunity,
  joinCommunity,
  updateCommunitySport,
} = require("../controllers/communityController");

router.get("/", protect, getCommunities);
router.post("/", protect, createCommunity);
router.patch("/:communityId", protect, updateCommunitySport);
router.post("/:communityId/join", protect, joinCommunity);

module.exports = router;
