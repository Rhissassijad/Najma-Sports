const express = require("express"),
  mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Sport = require("../models/Sport");
const Performance = require("../models/Performance");
const Rating = require("../models/userSport");
const { resolve, context, fail } = require("../utils/individualSports");
const router = express.Router();
router.use(protect);
const action = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    if (!e.status) console.error("Performance request failed:", e.name, e.code);
    res
      .status(
        e.status ||
          (["ValidationError", "CastError"].includes(e.name) ? 400 : 500),
      )
      .json({
        message: e.status ? e.message : "Unable to save or load the result.",
      });
  }
};
async function selected(req) {
  const id = req.body?.sportId || req.query.sportId;
  if (!mongoose.isValidObjectId(id)) fail("Choose a sport.");
  const sport = await Sport.findById(id);
  if (!sport) fail("Sport not found.", 404);
  return {
    sport,
    d: resolve(sport.name, req.body?.discipline || req.query.discipline),
  };
}
router.post(
  "/performances",
  action(async (req, res) => {
    const { sport, d } = await selected(req);
    if (d.mode === "racket") fail("Racket results must use confirmed matches.");
    const value = req.body.value;
    if (
      !Number.isFinite(value) ||
      value < (d.mode === "time" ? 0.001 : d.holes) ||
      value > (d.mode === "time" ? 86400 : d.holes * 30) ||
      (d.mode === "strokes" && !Number.isInteger(value))
    )
      fail(
        "Enter a valid positive time in seconds or whole-number stroke total.",
      );
    const recordedAt = new Date(req.body.recordedAt);
    if (
      !req.body.recordedAt ||
      Number.isNaN(recordedAt.getTime()) ||
      recordedAt > new Date()
    )
      fail("Choose a past or current result date.");
    const row = await Performance.create({
      userId: req.user.id,
      sportId: sport._id,
      discipline: d.id,
      value: d.mode === "time" ? Math.round(value * 1000) / 1000 : value,
      context: context(d, req.body.context),
      source: "self-reported",
      recordedAt,
    });
    res.status(201).json(row);
  }),
);
router.get(
  "/personal-bests",
  action(async (req, res) => {
    const { sport, d } = await selected(req);
    const rows = await Performance.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          sportId: sport._id,
          discipline: d.id,
        },
      },
      { $sort: { value: 1, recordedAt: 1 } },
      {
        $group: {
          _id: {
            source: "$source",
            course: "$context.courseKey",
            tees: "$context.teesKey",
            par: "$context.par",
          },
          result: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$result" } },
      { $sort: { value: 1 } },
    ]);
    res.json(rows);
  }),
);
router.get(
  "/performances",
  action(async (req, res) => {
    const { sport, d } = await selected(req);
    res.json(
      await Performance.find({
        userId: req.user.id,
        sportId: sport._id,
        discipline: d.id,
      })
        .sort({ recordedAt: -1 })
        .limit(100),
    );
  }),
);
router.delete(
  "/performances/:id",
  action(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) fail("Invalid result ID.");
    const row = await Performance.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
      source: "self-reported",
    });
    if (!row) fail("Only your self-reported results may be removed.", 403);
    res.json({ message: "Result removed." });
  }),
);
router.get(
  "/leaderboard",
  action(async (req, res) => {
    const { sport, d } = await selected(req);
    if (d.mode === "racket") fail("Use the discipline rating leaderboard.");
    const source = req.query.source || "opponent-confirmed";
    if (!["self-reported", "opponent-confirmed"].includes(source))
      fail("Choose a result source.");
    const query = { sportId: sport._id, discipline: d.id, source };
    if (d.mode === "strokes") {
      const c = context(d, req.query);
      Object.assign(query, {
        "context.courseKey": c.courseKey,
        "context.teesKey": c.teesKey,
        "context.par": c.par,
      });
    }
    const rows = await Performance.find(query)
      .sort({ value: 1, recordedAt: 1, _id: 1 })
      .populate("userId", "name")
      .lean();
    const best = new Map();
    for (const row of rows)
      if (!best.has(String(row.userId?._id)))
        best.set(String(row.userId?._id), row);
    let lastValue = null,
      rank = 0;
    res.json(
      [...best.values()].map((r, i) => {
        if (r.value !== lastValue) rank = i + 1;
        lastValue = r.value;
        return { ...r, rank };
      }),
    );
  }),
);
module.exports = router;
