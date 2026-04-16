const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getCommunities, createCommunity, joinCommunity } = require("../controllers/communityController");

router.get("/", protect, getCommunities);
router.post("/", protect, createCommunity);
router.post("/:communityId/join", protect, joinCommunity);

module.exports = router;
