const Match = require("../models/Match");
const Sport = require("../models/Sport");
const User = require("../models/User");
const getUpdatedRatings = require("../utils/getUpdatedRatings");
const updateRatings = require("../utils/UpdateRatings");
const calculateWinner = require("../utils/calculateWinner");

const createMatch = async (req, res) => {
  try {
    const { sport, players, score } = req.body;

    // ✅ Required fields
    if (!sport || !players || !score) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ message: "At least 2 players required" });
    }

    // ✅ Validate sport
    const sportExists = await Sport.findById(sport);
    if (!sportExists) {
      return res.status(404).json({ message: "Sport not found" });
    }

    // ✅ Validate players
    const existingPlayers = await User.find({ _id: { $in: players } });
    if (existingPlayers.length !== players.length) {
      return res.status(404).json({ message: "Player not found" });
    }

    // 🔥 DETERMINE WINNER FROM SCORE
    const winnerIndex = calculateWinner(score, players);

    if (winnerIndex === null || winnerIndex === undefined) {
      return res.status(400).json({ message: "Could not determine winner from score" });
    }

    // ✅ Create match
    const match = await Match.create({
      sport,
      players,
      score,
      winner: winnerIndex,
    });

    // update ratings AFTER match creation
    const winnerId = players[winnerIndex];
    const loserIds = players.filter((_, i) => i !== winnerIndex);

    for (const loserId of loserIds) {
      await updateRatings(winnerId, loserId, sport, match._id);
    }

    // get updated ratings for all players
    const updatedRatings = await getUpdatedRatings(players, sport);

    return res.status(201).json({
      ...match.toObject(),
      updatedRatings,
    });

    res.status(201).json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
const getUserMatches = async (req, res) => {
  try {
    const { userId } = req.params;

    const matches = await Match.find({
      players: userId,
    })
      .populate("players", "name email")
      .populate("sport", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createMatch,
  getUserMatches,
};