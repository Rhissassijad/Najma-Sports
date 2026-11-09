const mongoose = require("mongoose");
const Match = require("../models/Match");
const Sport = require("../models/Sport");
const User = require("../models/User");
const Performance = require("../models/Performance");
const enrich = require("../utils/enrichMatches");
const updateRatings = require("../utils/updateIndividualRatings");
const { resolve, context, result, fail } = require("../utils/individualSports");
const action = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    if (e.code === 11000 || e.name === "VersionError")
      return res
        .status(409)
        .json({ message: "This match changed. Refresh and retry." });
    const status =
      e.status ||
      (["CastError", "ValidationError"].includes(e.name) ? 400 : 500);
    if (status === 500)
      console.error("Individual match failed:", e.name, e.code);
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Match request failed. Check database transaction support and retry."
            : e.message,
      });
  }
};
const get = async (id, session) => {
  if (!mongoose.isValidObjectId(id)) fail("Invalid match ID.");
  const match = await Match.findById(id).session(session || null);
  if (!match) fail("Match not found.", 404);
  return match;
};
const populated = async (match) => {
  await match.populate([
    { path: "players", select: "name firstName lastName" },
    { path: "sport", select: "name" },
    { path: "resultReporter", select: "name" },
  ]);
  return (await enrich([match]))[0];
};
exports.createMatch = action(async (req, res) => {
  const sport = mongoose.isValidObjectId(req.body.sport)
    ? await Sport.findById(req.body.sport)
    : null;
  if (!sport) fail("Choose a valid sport.");
  const d = resolve(sport.name, req.body.discipline);
  if (!(await User.exists({ _id: req.user.id })))
    fail("Player not found.", 401);
  const scheduledAt = req.body.scheduledAt
    ? new Date(req.body.scheduledAt)
    : null;
  if (
    scheduledAt &&
    (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date())
  )
    fail("Scheduled date must be in the future.");
  const match = await Match.create({
    sport: sport._id,
    discipline: d.id,
    sideSize: d.sideSize,
    players: [req.user.id],
    sideAssignments: [0],
    createdBy: req.user.id,
    status: "open",
    context: context(d, req.body.context),
    scheduledAt,
    venue: String(req.body.venue || "")
      .trim()
      .slice(0, 120),
  });
  res.status(201).json(await populated(match));
});
exports.getUserMatches = action(async (req, res) => {
  const id = req.params.userId || req.user.id;
  if (!mongoose.isValidObjectId(id)) fail("Invalid user ID.");
  const rows = await Match.find({ players: id })
    .populate("players", "name firstName lastName")
    .populate("sport", "name")
    .populate("resultReporter", "name")
    .sort({ createdAt: -1 });
  res.json(await enrich(rows));
});
exports.getOpenMatches = action(async (req, res) => {
  const rows = await Match.find({
    status: { $in: ["open", "awaiting_result", "awaiting_confirmation"] },
  })
    .populate("players", "name firstName lastName")
    .populate("sport", "name")
    .populate("resultReporter", "name")
    .sort({ createdAt: -1 });
  res.json(await enrich(rows));
});
exports.joinMatch = action(async (req, res) => {
  const session = await mongoose.startSession();
  let joined;
  try {
    await session.withTransaction(async () => {
      const m = await get(req.params.matchId, session);
      if (
        m.status !== "open" ||
        m.players.some((p) => String(p) === req.user.id)
      )
        fail("This match is not available to join.", 409);
      if (!(await User.exists({ _id: req.user.id }).session(session)))
        fail("Player not found.", 401);
      const sport = await Sport.findById(m.sport).session(session),
        d = resolve(sport.name, m.discipline);
      if (!m.sideAssignments.length) m.sideAssignments = [0];
      const side =
        req.body?.side === undefined
          ? [0, 1].find(
              (side) =>
                m.sideAssignments.filter((s) => s === side).length < d.sideSize,
            )
          : req.body.side;
      if (
        ![0, 1].includes(side) ||
        m.sideAssignments.filter((s) => s === side).length >= d.sideSize
      )
        fail("Choose a side with an open place.", 409);
      m.players.push(req.user.id);
      m.sideAssignments.push(side);
      if (m.players.length === d.sideSize * 2) m.status = "awaiting_result";
      await m.save({ session });
      joined = m;
    });
    res.json(await populated(joined));
  } finally {
    await session.endSession();
  }
});
exports.proposeResult = action(async (req, res) => {
  const m = await get(req.params.matchId);
  if (
    m.status !== "awaiting_result" ||
    !m.players.some((p) => String(p) === req.user.id)
  )
    fail("Only a participant can submit a result for a ready match.", 409);
  if (m.scheduledAt && m.scheduledAt > new Date())
    fail("The match has not started yet.");
  const sport = await Sport.findById(m.sport),
    d = resolve(sport.name, m.discipline);
  const parsed = result(d, req.body?.score);
  const updated = await Match.findOneAndUpdate(
    { _id: m._id, status: "awaiting_result" },
    {
      $set: {
        proposedScore: parsed.score,
        resultReporter: req.user.id,
        confirmations: [req.user.id],
        status: "awaiting_confirmation",
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) fail("A result was submitted first.", 409);
  res.json(await populated(updated));
});
exports.confirmResult = action(async (req, res) => {
  const session = await mongoose.startSession();
  let completed;
  try {
    await session.withTransaction(async () => {
      const m = await get(req.params.matchId, session);
      if (
        m.status !== "awaiting_confirmation" ||
        !m.players.some((p) => String(p) === req.user.id) ||
        m.confirmations.some((p) => String(p) === req.user.id) ||
        String(m.resultReporter) === req.user.id
      )
        fail("Only an unconfirmed participant may confirm this result.", 409);
      if (
        m.resultReporter &&
        !m.confirmations.some((p) => String(p) === String(m.resultReporter))
      )
        m.confirmations.push(m.resultReporter);
      m.confirmations.push(req.user.id);
      if (m.confirmations.length === m.players.length) {
        const sport = await Sport.findById(m.sport).session(session),
          d = resolve(sport.name, m.discipline),
          parsed = result(d, m.proposedScore);
        m.score = parsed.score;
        m.winner = parsed.winner;
        if (d.mode === "racket") await updateRatings(m, session);
        else
          for (const [i, userId] of m.players.entries())
            await Performance.create(
              [
                {
                  userId,
                  sportId: m.sport,
                  discipline: d.id,
                  value: parsed.score.values[i],
                  context: m.context,
                  source: "opponent-confirmed",
                  matchId: m._id,
                  recordedAt: m.scheduledAt || new Date(),
                },
              ],
              { session },
            );
        m.proposedScore = null;
        m.status = "completed";
      }
      await m.save({ session });
      completed = m;
    });
    res.json(await populated(completed));
  } finally {
    await session.endSession();
  }
});
