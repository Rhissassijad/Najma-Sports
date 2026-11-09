const mongoose = require("mongoose");
const User = require("../models/User"),
  Post = require("../models/FeedPost"),
  Sport = require("../models/Sport"),
  Match = require("../models/Match");
const { TeamSquad, TeamMatch } = require("../models/TeamSports");
const { Reaction, Comment, Challenge } = require("../models/FeedInteraction");
const {
  fail,
  optionalUser,
  accessiblePost,
  summaries,
} = require("../utils/feedAccess");
const { resolve, context } = require("../utils/individualSports");
const { isTeamSport } = require("../utils/sports");
const action = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    const status =
      e.code === 11000
        ? 409
        : e.status ||
          (["CastError", "ValidationError"].includes(e.name) ? 400 : 500);
    if (status === 500)
      console.error("Feed interaction failed:", e.name, e.code);
    res
      .status(status)
      .json({
        message:
          e.code === 11000
            ? "This invitation or interaction already exists. Refresh to see its state."
            : e.status
              ? e.message
              : "Could not complete this action. Check the API and database transaction support.",
      });
  }
};
async function transaction(fn) {
  const session = await mongoose.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await fn(session);
    });
    return value;
  } finally {
    await session.endSession();
  }
}
async function touchPost(req, session) {
  const post = await accessiblePost(req.params.postId, req.user.id, session);
  if (!(await User.exists({ _id: req.user.id }).session(session)))
    fail("Player not found.", 401);
  await Post.updateOne(
    { _id: post._id },
    { $inc: { interactionVersion: 1 } },
    { session },
  );
  return post;
}
const populate = (post) =>
  post.populate([
    { path: "author", select: "name firstName lastName" },
    { path: "community", select: "name" },
  ]);
async function stats(postId, userId) {
  const post = await Post.findById(postId);
  if (!post) fail("Post not found.", 404);
  const p = (await summaries([post], userId))[0];
  return {
    likes: p.likes,
    dislikes: p.dislikes,
    commentCount: p.commentCount,
    myReaction: p.myReaction,
  };
}
exports.getPost = action(async (req, res) => {
  const user = optionalUser(req),
    p = await accessiblePost(req.params.postId, user);
  await populate(p);
  res.json((await summaries([p], user))[0]);
});
exports.react = action(async (req, res) => {
  const value = req.body?.reaction;
  if (![null, "like", "dislike"].includes(value))
    fail("Choose like, dislike, or null to remove a reaction.");
  await transaction(async (session) => {
    const post = await touchPost(req, session);
    if (value === null)
      await Reaction.deleteOne(
        { post: post._id, user: req.user.id },
        { session },
      );
    else
      await Reaction.updateOne(
        { post: post._id, user: req.user.id },
        { $set: { reaction: value } },
        { upsert: true, session, runValidators: true },
      );
  });
  res.json(await stats(req.params.postId, req.user.id));
});
exports.getComments = action(async (req, res) => {
  await accessiblePost(req.params.postId, optionalUser(req));
  const query = { post: req.params.postId };
  if (req.query.before) {
    if (!mongoose.isValidObjectId(req.query.before))
      fail("Invalid comment cursor.");
    query._id = { $lt: req.query.before };
  }
  const rows = await Comment.find(query)
    .sort({ _id: -1 })
    .limit(51)
    .populate("author", "name");
  const comments = rows.slice(0, 50);
  res.json({
    comments,
    nextCursor: rows.length > 50 ? String(comments[49]._id) : null,
  });
});
exports.addComment = action(async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1000)
    fail("Comments must contain 1–1,000 characters.");
  const row = await transaction(async (session) => {
    const post = await touchPost(req, session);
    return (
      await Comment.create([{ post: post._id, author: req.user.id, text }], {
        session,
      })
    )[0];
  });
  await row.populate("author", "name");
  res
    .status(201)
    .json({ comment: row, ...(await stats(req.params.postId, req.user.id)) });
});
exports.deleteComment = action(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.commentId))
    fail("Invalid comment ID.");
  await transaction(async (session) => {
    const post = await touchPost(req, session);
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      post: post._id,
    }).session(session);
    if (!comment) fail("Comment not found.", 404);
    if (
      String(comment.author) !== req.user.id &&
      String(post.author) !== req.user.id
    )
      fail(
        "Only the comment author or post owner may delete this comment.",
        403,
      );
    await Comment.deleteOne({ _id: comment._id }, { session });
  });
  res.json(await stats(req.params.postId, req.user.id));
});
exports.deletePost = action(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) fail("Invalid post ID.");
  await transaction(async (session) => {
    const post = await Post.findById(req.params.postId).session(session);
    if (!post) fail("Post not found.", 404);
    if (String(post.author) !== req.user.id)
      fail("You can only delete your own posts.", 403);
    await Post.deleteOne({ _id: post._id }, { session });
    await Reaction.deleteMany({ post: post._id }, { session });
    await Comment.deleteMany({ post: post._id }, { session });
  });
  res.json({ success: true, postId: req.params.postId });
});
exports.createChallenge = action(async (req, res) => {
  const created = await transaction(async (session) => {
    const post = await touchPost(req, session);
    if (String(post.author) === req.user.id)
      fail("Challenge another player’s post.");
    const sport = await Sport.findOne({ name: post.sportTag }).session(session);
    if (!sport) fail("Sport not found.", 404);
    const scheduledAt = req.body?.scheduledAt
      ? new Date(req.body.scheduledAt)
      : null;
    if (
      scheduledAt &&
      (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date())
    )
      fail("Choose a future challenge date or leave it blank.");
    const data = {
      post: post._id,
      from: req.user.id,
      to: post.author,
      sport: post.sportTag,
      sportId: sport._id,
      venue: String(req.body?.venue || "")
        .trim()
        .slice(0, 120),
      scheduledAt,
    };
    if (isTeamSport(post.sportTag)) {
      if (
        !mongoose.isValidObjectId(req.body?.fromSquad) ||
        !mongoose.isValidObjectId(req.body?.toSquad)
      )
        fail("Choose both squads.");
      const from = await TeamSquad.findById(req.body.fromSquad).session(
          session,
        ),
        to = await TeamSquad.findById(req.body.toSquad).session(session);
      if (!from || !to) fail("Squad not found.", 404);
      if (String(from.manager) !== req.user.id)
        fail("Only your squad manager can challenge.", 403);
      if (
        String(to.manager) === req.user.id ||
        String(from._id) === String(to._id)
      )
        fail("Choose a squad managed by someone else.");
      if (
        (from.sport || "Soccer") !== post.sportTag ||
        (to.sport || "Soccer") !== post.sportTag ||
        from.format !== to.format
      )
        fail("Squads must share this post’s sport and the same format.");
      if (
        String(to.manager) !== String(post.author) &&
        !to.members.some(
          (m) =>
            String(m.user) === String(post.author) && m.status === "accepted",
        )
      )
        fail("The post author must manage or belong to the opposing squad.");
      Object.assign(data, {
        kind: "team",
        to: to.manager,
        fromSquad: from._id,
        toSquad: to._id,
      });
    } else {
      const d = resolve(post.sportTag, post.discipline || req.body?.discipline);
      if (
        post.discipline &&
        req.body?.discipline &&
        req.body.discipline !== post.discipline
      )
        fail("Use the discipline specified by this post.");
      Object.assign(data, {
        kind: "individual",
        discipline: d.id,
        context: context(d, req.body?.context),
      });
    }
    if (!(await User.exists({ _id: data.to }).session(session)))
      fail("Opponent not found.", 404);
    return (await Challenge.create([data], { session }))[0];
  });
  res.status(201).json(created);
});
exports.getChallenges = action(async (req, res) => {
  const rows = await Challenge.find({
    $or: [{ from: req.user.id }, { to: req.user.id }],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("from to", "name")
    .populate("fromSquad toSquad", "name format")
    .lean();
  res.json(rows);
});
exports.respondChallenge = action(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail("Invalid challenge ID.");
  const kind = req.params.action;
  if (!["accept", "decline", "cancel"].includes(kind))
    fail("Unknown response.");
  const row = await transaction(async (session) => {
    const invite = await Challenge.findById(req.params.id).session(session);
    if (!invite) fail("Challenge not found.", 404);
    if (invite.status !== "pending")
      fail("This challenge has already been answered.", 409);
    if (String(kind === "cancel" ? invite.from : invite.to) !== req.user.id)
      fail(
        "Only the invitation’s recipient can respond, or its sender cancel.",
        403,
      );
    if (kind === "accept") {
      if (invite.scheduledAt && invite.scheduledAt <= new Date())
        fail(
          "The proposed date has passed. Decline this invitation and arrange a new date.",
          409,
        );
      if (!(await User.exists({ _id: invite.from }).session(session)))
        fail("Challenger no longer exists.", 404);
      if (invite.kind === "individual") {
        const d = resolve(invite.sport, invite.discipline);
        const match = (
          await Match.create(
            [
              {
                sport: invite.sportId,
                discipline: d.id,
                sideSize: d.sideSize,
                players: [invite.from, invite.to],
                sideAssignments: [0, 1],
                createdBy: invite.from,
                status: d.sideSize === 1 ? "awaiting_result" : "open",
                context: invite.context,
                venue: invite.venue,
                scheduledAt: invite.scheduledAt,
              },
            ],
            { session },
          )
        )[0];
        invite.match = match._id;
      } else {
        const from = await TeamSquad.findById(invite.fromSquad).session(
            session,
          ),
          to = await TeamSquad.findById(invite.toSquad).session(session);
        if (
          !from ||
          !to ||
          String(from.manager) !== String(invite.from) ||
          String(to.manager) !== String(invite.to) ||
          from.format !== to.format ||
          (from.sport || "Soccer") !== invite.sport ||
          (to.sport || "Soccer") !== invite.sport
        )
          fail("Squad eligibility changed. Arrange a new challenge.", 409);
        const match = (
          await TeamMatch.create(
            [
              {
                home: from._id,
                away: to._id,
                sport: invite.sport,
                format: from.format,
                status: "scheduled",
                scheduledAt: invite.scheduledAt || new Date(),
                venue: invite.venue,
                mode: "results",
              },
            ],
            { session },
          )
        )[0];
        invite.teamMatch = match._id;
      }
    }
    invite.status =
      kind === "accept"
        ? "accepted"
        : kind === "decline"
          ? "declined"
          : "cancelled";
    await invite.save({ session });
    return invite;
  });
  res.json(row);
});
