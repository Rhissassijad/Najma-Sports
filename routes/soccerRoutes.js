const express = require("express");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const {
  SoccerClub: Club,
  SoccerSquad: Squad,
  SoccerMatch: Match,
} = require("../models/Soccer");
const {
  same,
  fail,
  text,
  score,
  lineup,
  validateTotals,
  squadElo,
  positions,
} = require("../utils/soccer");
const router = express.Router();
router.use(protect);
const route = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    if (e.code === 11000 || e.name === "VersionError")
      return res
        .status(409)
        .json({ message: "This record changed. Refresh and try again." });
    const status =
      e.status ||
      (["ValidationError", "CastError"].includes(e.name) ? 400 : 500);
    if (status === 500) console.error("Soccer request failed:", e.name, e.code);
    res.status(status).json({
      message:
        status === 500
          ? "Soccer request failed. Check database transaction support and try again."
          : e.message,
    });
  }
};
async function get(Model, id, session) {
  if (!mongoose.isValidObjectId(id)) fail("Invalid record ID.");
  const record = await Model.findById(id).session(session || null);
  if (!record) fail("Record not found.", 404);
  return record;
}
async function managed(id, user, session) {
  const squad = await get(Squad, id, session);
  if (!same(squad.manager, user))
    fail("Only this squad’s manager can do that.", 403);
  return squad;
}
async function sideFor(match, user, session) {
  const home = await get(Squad, match.home, session);
  const away = await get(Squad, match.away, session);
  if (same(home.manager, user))
    return { squad: home, side: "home", other: away };
  if (same(away.manager, user))
    return { squad: away, side: "away", other: home };
  fail("Only a participating squad manager can do that.", 403);
}
router.get(
  "/",
  route(async (req, res) => {
    const [clubs, squads, matches, me] = await Promise.all([
      Club.find().sort({ name: 1 }).lean(),
      Squad.find().sort({ rating: -1, _id: 1 }).lean(),
      Match.find().sort({ scheduledAt: -1 }).limit(100).lean(),
      User.findById(req.user.id).select("name soccer onboarding").lean(),
    ]);
    // Pending membership requests and invitations are visible only to their player and manager.
    for (const s of squads)
      s.members = s.members.filter(
        (m) =>
          m.status === "accepted" ||
          same(s.manager, req.user.id) ||
          same(m.user, req.user.id),
      );
    res.json({ clubs, squads, matches, me, userId: req.user.id });
  }),
);
router.post(
  "/clubs",
  route(async (req, res) => {
    const club = await Club.create({
      name: text(req.body.name, "Club name"),
      owner: req.user.id,
    });
    res.status(201).json(club);
  }),
);
router.post(
  "/squads",
  route(async (req, res) => {
    if (!["5", "7", "11"].includes(req.body.format))
      fail("Choose 5, 7 or 11-a-side.");
    let club = null;
    if (req.body.club) {
      club = await get(Club, req.body.club);
      if (!same(club.owner, req.user.id))
        fail("Only the club owner can create its squads.", 403);
    }
    const squad = await Squad.create({
      name: text(req.body.name, "Squad name"),
      format: req.body.format,
      club: club?._id || null,
      manager: req.user.id,
    });
    res.status(201).json(squad);
  }),
);
router.post(
  "/squads/:id/membership",
  route(async (req, res) => {
    const squad = await get(Squad, req.params.id);
    const { action } = req.body;
    let playerId = req.user.id;
    if (action === "invite") {
      if (!same(squad.manager, req.user.id))
        fail("Only the manager may invite players.", 403);
      const player = await User.findOne({
        email: String(req.body.email || "")
          .trim()
          .toLowerCase(),
      }).select("_id");
      if (!player) fail("No registered player found with that email.", 404);
      playerId = player._id;
    } else if (["accept", "decline"].includes(action) && req.body.playerId)
      playerId = req.body.playerId;
    let member = squad.members.find((m) => same(m.user, playerId));
    if (["request", "invite"].includes(action)) {
      if (
        member &&
        ["accepted", "requested", "invited"].includes(member.status)
      )
        fail("Membership already exists or is awaiting a response.", 409);
      const player = await get(User, playerId);
      const next = {
        user: player._id,
        name: player.name,
        status: action === "request" ? "requested" : "invited",
        joinedAt: undefined,
        leftAt: undefined,
      };
      if (member) Object.assign(member, next);
      else squad.members.push(next);
    } else if (["accept", "decline"].includes(action)) {
      if (!member || !["requested", "invited"].includes(member.status))
        fail("No pending membership.");
      const canRespond =
        member.status === "requested"
          ? same(squad.manager, req.user.id)
          : same(member.user, req.user.id);
      if (!canRespond)
        fail("The receiving party must respond to this membership.", 403);
      member.status = action === "accept" ? "accepted" : "declined";
      if (action === "accept") member.joinedAt = new Date();
    } else if (action === "leave" || action === "remove") {
      if (action === "remove") {
        if (!same(squad.manager, req.user.id))
          fail("Only the manager may remove players.", 403);
        member = squad.members.find((m) => same(m.user, req.body.playerId));
      }
      if (!member || member.status !== "accepted")
        fail("No accepted membership.");
      member.status = "left";
      member.leftAt = new Date();
    } else fail("Unknown membership action.");
    await squad.save();
    res.json(squad);
  }),
);
router.patch(
  "/profile",
  route(async (req, res) => {
    const { position, foot } = req.body;
    if (
      !positions.includes(position) ||
      !["Left", "Right", "Both"].includes(foot)
    )
      fail("Choose a valid position and dominant foot.");
    const me = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { soccer: { position, foot } } },
      { new: true, runValidators: true },
    ).select("name soccer");
    res.json(me);
  }),
);
router.get(
  "/players/:id",
  route(async (req, res) => {
    const player = await get(User, req.params.id);
    const [squads, matches] = await Promise.all([
      Squad.find({
        members: { $elemMatch: { user: player._id, status: "accepted" } },
      })
        .select("name format rating club")
        .populate("club", "name"),
      Match.find({
        status: "completed",
        mode: "detailed",
        $or: [
          { "homeLineup.user": player._id },
          { "awayLineup.user": player._id },
        ],
      })
        .sort({ confirmedAt: -1 })
        .lean(),
    ]);
    const appearances = matches.flatMap((m) =>
      [...m.homeLineup, ...m.awayLineup]
        .filter((r) => same(r.user, player._id) && r.minutes > 0)
        .map((r) => ({
          ...r,
          matchId: m._id,
          date: m.confirmedAt,
          format: m.format,
        })),
    );
    res.json({
      player: { _id: player._id, name: player.name, soccer: player.soccer },
      squads,
      appearances,
      source:
        "Team-recorded; match result confirmed by opponent. Individual statistics are not independently verified.",
    });
  }),
);
router.post(
  "/matches",
  route(async (req, res) => {
    const home = await managed(req.body.home, req.user.id),
      away = await get(Squad, req.body.away);
    if (same(home, away) || same(home.manager, away.manager))
      fail("Challenge a squad managed by another person.");
    if (home.format !== away.format) fail("Squads must play the same format.");
    const scheduledAt = new Date(req.body.scheduledAt);
    if (!req.body.scheduledAt || Number.isNaN(scheduledAt.getTime()))
      fail("Choose a valid match date.");
    if (!["results", "detailed"].includes(req.body.mode))
      fail("Choose results-only or detailed tracking.");
    const match = await Match.create({
      home: home._id,
      away: away._id,
      format: home.format,
      scheduledAt,
      venue:
        typeof req.body.venue === "string"
          ? req.body.venue.trim().slice(0, 120)
          : "",
      mode: req.body.mode,
    });
    res.status(201).json(match);
  }),
);
router.post(
  "/matches/:id/:action",
  route(async (req, res) => {
    // All transitions use a transaction so confirmation and both squad ratings commit together.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const match = await get(Match, req.params.id, session);
        const { squad, side, other } = await sideFor(
          match,
          req.user.id,
          session,
        );
        const action = req.params.action;
        if (action === "accept" || action === "decline") {
          if (match.status !== "challenge" || side !== "away")
            fail(
              "Only the challenged squad can respond to a pending challenge.",
              409,
            );
          match.status = action === "accept" ? "scheduled" : "declined";
        } else if (action === "lineup") {
          if (!["scheduled", "disputed"].includes(match.status))
            fail(
              "Lineups can only be edited before a result is awaiting confirmation.",
              409,
            );
          match[`${side}Lineup`] = lineup(req.body.players, squad);
        } else if (action === "result") {
          if (!["scheduled", "disputed"].includes(match.status))
            fail("This match is not ready for a result.", 409);
          if (match.scheduledAt > new Date())
            fail("A result cannot be recorded before the match date.");
          const homeScore = score(req.body.homeScore),
            awayScore = score(req.body.awayScore);
          if (match.mode === "detailed") {
            if (
              !match.homeLineup.some((row) => row.minutes > 0) ||
              !match.awayLineup.some((row) => row.minutes > 0)
            )
              fail(
                "Both managers must record participating players with minutes before a detailed result.",
              );
            validateTotals(match.homeLineup, homeScore);
            validateTotals(match.awayLineup, awayScore);
            const homeIds = new Set(
              match.homeLineup.map((r) => String(r.user)),
            );
            if (match.awayLineup.some((r) => homeIds.has(String(r.user))))
              fail("A player cannot appear for both squads in the same match.");
          }
          match.homeScore = homeScore;
          match.awayScore = awayScore;
          match.reporter = squad._id;
          match.status = "awaiting_confirmation";
        } else if (action === "dispute") {
          if (
            match.status !== "awaiting_confirmation" ||
            same(match.reporter, squad._id)
          )
            fail(
              "Only the opposing manager can dispute a pending result.",
              409,
            );
          match.status = "disputed";
        } else if (action === "confirm") {
          if (
            match.status !== "awaiting_confirmation" ||
            same(match.reporter, squad._id)
          )
            fail(
              "Only the opposing manager can confirm a pending result.",
              409,
            );
          const home = side === "home" ? squad : other,
            away = side === "away" ? squad : other;
          match.ratingBefore = [home.rating, away.rating];
          match.ratingAfter = squadElo(
            home.rating,
            away.rating,
            match.homeScore,
            match.awayScore,
          );
          for (const [index, team] of [home, away].entries()) {
            const goals = index === 0 ? match.homeScore : match.awayScore,
              against = index === 0 ? match.awayScore : match.homeScore;
            team.rating = match.ratingAfter[index];
            team.played += 1;
            team.goalsFor += goals;
            team.goalsAgainst += against;
            team[
              goals === against ? "draws" : goals > against ? "wins" : "losses"
            ] += 1;
            await team.save({ session });
          }
          match.status = "completed";
          match.confirmedAt = new Date();
        } else fail("Unknown match action.");
        await match.save({ session });
      });
      res.json({ message: "Match updated." });
    } finally {
      await session.endSession();
    }
  }),
);
module.exports = router;
