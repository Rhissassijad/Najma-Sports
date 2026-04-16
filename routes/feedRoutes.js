const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getFeedPosts, createFeedPost, updateFeedPost, deleteFeedPost } = require("../controllers/feedController");

router.get("/posts", getFeedPosts);
router.post("/posts", protect, createFeedPost);
router.put("/posts/:postId", protect, updateFeedPost);
router.delete("/posts/:postId", protect, deleteFeedPost);

module.exports = router;
