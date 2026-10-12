const mongoose = require("mongoose");
const Match = require("../models/Match");
const Sport = require("../models/Sport");
const User = require("../models/User");
const updateRatings = require("../utils/UpdateRatings");
const calculateWinner = require("../utils/calculateWinner");
const enrichMatches = require("../utils/enrichMatches");

const httpError = (status, message) => Object.assign(new Error(message), { status });

const createMatch = async (req, res) => {
  try {
    const { sport, scheduledAt, venue, type } = req.body;

    if (!sport || !mongoose.isValidObjectId(sport)) {
      return res.status(400).json({ message: "A valid sport ID is required" });
    }

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled date must be in the future" });
      }
    }

    const [sportExists, creator] = await Promise.all([
      Sport.findById(sport),
      User.findById(req.user.id),
    ]);

    if (!sportExists) {
      return res.status(404).json({ message: "Sport not found" });
    }
    if (!creator) {
      return res.status(401).json({ message: "Authenticated player no longer exists" });
    }

    const match = await Match.create({
      sport,
      players: [creator._id],
      createdBy: creator._id,
      status: "open",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      venue: typeof venue === "string" ? venue.trim() : undefined,
      type: typeof type === "string" ? type.trim() : undefined,
    });

    await match.populate([
      { path: "players", select: "name firstName lastName" },
      { path: "sport", select: "name" },
    ]);

    return res.status(201).json(match);
  } catch (error) {
    console.error("Create match error:", error);
    return res.status(500).json({ message: "Failed to create match" });
  }
};

const getUserMatches = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const matches = await Match.find({ players: userId })
      .populate("players", "name firstName lastName")
      .populate("sport", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(await enrichMatches(matches));
  } catch (error) {
    console.error("Get user matches error:", error);
    return res.status(500).json({ message: "Failed to retrieve matches" });
  }
};

const getOpenMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      status: { $in: ["open", "awaiting_result", "awaiting_confirmation"] },
    })
      .populate("players", "name firstName lastName")
      .populate("sport", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(await enrichMatches(matches));
  } catch (error) {
    console.error("Get open matches error:", error);
    return res.status(500).json({ message: "Failed to retrieve open matches" });
  }
};

const joinMatch = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    const match = await Match.findOneAndUpdate(
      {
        _id: req.params.matchId,
        status: "open",
        players: { $size: 1, $ne: req.user.id },
      },
      {
        $addToSet: { players: req.user.id },
        $set: { status: "awaiting_result" },
      },
      { new: true, runValidators: true }
    )
      .populate("players", "name firstName lastName")
      .populate("sport", "name");

    if (!match) {
      const existingMatch = await Match.findById(req.params.matchId).select("status players");
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      return res.status(409).json({ message: "This match is no longer available to join" });
    }

    return res.status(200).json(match);
  } catch (error) {
    console.error("Join match error:", error);
    return res.status(500).json({ message: "Failed to join match" });
  }
};

const proposeResult = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    const existingMatch = await Match.findOne({
      _id: req.params.matchId,
      status: "awaiting_result",
      players: req.user.id,
    });

    if (!existingMatch) {
      const existingMatch = await Match.findById(req.params.matchId).select("status");
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      return res.status(409).json({ message: "This match is not awaiting a result" });
    }

    const winner = calculateWinner(req.body.score, existingMatch.players);
    if (winner === null) {
      return res.status(400).json({ message: "A valid, non-tied score is required" });
    }

    const match = await Match.findOneAndUpdate(
      {
        _id: req.params.matchId,
        status: "awaiting_result",
        players: req.user.id,
      },
      {
        $set: {
          status: "awaiting_confirmation",
          proposedScore: req.body.score,
          resultReporter: req.user.id,
        },
      },
      { new: true, runValidators: true }
    );
    if (!match) {
      return res.status(409).json({ message: "Another result was submitted first" });
    }
    await match.populate([
      { path: "players", select: "name firstName lastName" },
      { path: "sport", select: "name" },
      { path: "resultReporter", select: "name firstName lastName" },
    ]);

    return res.status(200).json(match);
  } catch (error) {
    console.error("Propose match result error:", error);
    return res.status(500).json({ message: "Failed to submit match result" });
  }
};

const confirmResult = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.matchId)) {
    return res.status(400).json({ message: "Invalid match ID" });
  }

  const session = await mongoose.startSession();

  try {
    let completedMatch;
    await session.withTransaction(async () => {
      const match = await Match.findOne({
        _id: req.params.matchId,
        status: "awaiting_confirmation",
        players: req.user.id,
        resultReporter: { $ne: req.user.id },
      }).session(session);

      if (!match) {
        const existingMatch = await Match.findById(req.params.matchId)
          .select("status players resultReporter")
          .session(session);
        if (!existingMatch) {
          throw httpError(404, "Match not found");
        }
        throw httpError(409, "Only the other player can confirm this pending result");
      }

      const winnerIndex = calculateWinner(match.proposedScore, match.players);
      if (winnerIndex === null || match.players.length !== 2) {
        throw httpError(409, "The pending match result is invalid");
      }

      const winnerId = match.players[winnerIndex];
      const loserId = match.players[1 - winnerIndex];
      await updateRatings(winnerId, loserId, match.sport, match._id, session);

      match.score = match.proposedScore;
      match.winner = winnerIndex;
      match.proposedScore = null;
      match.resultReporter = null;
      match.status = "completed";
      await match.save({ session });
      completedMatch = match;
    });

    await completedMatch.populate([
      { path: "players", select: "name firstName lastName" },
      { path: "sport", select: "name" },
    ]);
    return res.status(200).json(completedMatch);
  } catch (error) {
    console.error("Confirm match result error:", error);
    return res
      .status(error.status || 500)
      .json({ message: error.status ? error.message : "Failed to confirm match result" });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createMatch,
  getUserMatches,
  getOpenMatches,
  joinMatch,
  proposeResult,
  confirmResult,
};
