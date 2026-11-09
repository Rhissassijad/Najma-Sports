const mongoose = require("mongoose"),
  jwt = require("jsonwebtoken");
const Post = require("../models/FeedPost"),
  Community = require("../models/Community");
const { Reaction, Comment } = require("../models/FeedInteraction");
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
function optionalUser(req) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) return null;
    return jwt.verify(h.slice(7), process.env.JWT_SECRET).id || null;
  } catch {
    return null;
  }
}
async function accessiblePost(id, userId, session) {
  if (!mongoose.isValidObjectId(id)) fail("Invalid post ID.");
  const post = await Post.findById(id).session(session || null);
  if (!post) fail("Post not found.", 404);
  if (post.community) {
    const member =
      userId &&
      (await Community.exists({ _id: post.community, members: userId }).session(
        session || null,
      ));
    if (!member) fail("Join this community to access the post.", 403);
  }
  return post;
}
async function summaries(posts, userId) {
  if (!posts.length) return [];
  const ids = posts.map((p) => p._id);
  const [reactions, comments, mine] = await Promise.all([
    Reaction.aggregate([
      { $match: { post: { $in: ids } } },
      {
        $group: {
          _id: { post: "$post", reaction: "$reaction" },
          count: { $sum: 1 },
        },
      },
    ]),
    Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    userId ? Reaction.find({ post: { $in: ids }, user: userId }).lean() : [],
  ]);
  return posts.map((post) => {
    const p = post.toObject ? post.toObject() : post,
      key = String(p._id);
    return {
      ...p,
      likes:
        reactions.find(
          (r) => String(r._id.post) === key && r._id.reaction === "like",
        )?.count || 0,
      dislikes:
        reactions.find(
          (r) => String(r._id.post) === key && r._id.reaction === "dislike",
        )?.count || 0,
      commentCount: comments.find((c) => String(c._id) === key)?.count || 0,
      myReaction: mine.find((r) => String(r.post) === key)?.reaction || null,
    };
  });
}
module.exports = { fail, optionalUser, accessiblePost, summaries };
