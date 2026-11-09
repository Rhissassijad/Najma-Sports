const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getFeedPosts,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
} = require("../controllers/feedController");

const interactions = require("../controllers/feedInteractionController");
router.get("/challenges", protect, interactions.getChallenges);
router.post("/challenges/:id/:action", protect, interactions.respondChallenge);
router.get("/posts", getFeedPosts);
router.get("/posts/:postId", interactions.getPost);
router.post("/posts/:postId/reaction", protect, interactions.react);
router.get("/posts/:postId/comments", interactions.getComments);
router.post("/posts/:postId/comments", protect, interactions.addComment);
router.delete(
  "/posts/:postId/comments/:commentId",
  protect,
  interactions.deleteComment,
);
router.post("/posts/:postId/challenges", protect, interactions.createChallenge);
router.post("/posts", protect, createFeedPost);
router.put("/posts/:postId", protect, updateFeedPost);
router.delete("/posts/:postId", protect, deleteFeedPost);

module.exports = router;
