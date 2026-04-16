// services/ratingService.js
const { updateElo } = require("../utils/elo");
const UserSport = require("../models/userSport");
const RatingHistory = require("../models/RatingHistory");

/**
 * Update ratings for a match
 * winnerScore: 1 = win, 0.5 = draw, 0 = loss
 */
async function updateRatings(playerAId, playerBId, sportId, winnerScoreA, matchId) {
  // Find or create UserSport records
  let playerA = await UserSport.findOne({ userId: playerAId, sportId });
  if (!playerA) {
    playerA = await UserSport.create({ userId: playerAId, sportId });
  }

  let playerB = await UserSport.findOne({ userId: playerBId, sportId });
  if (!playerB) {
    playerB = await UserSport.create({ userId: playerBId, sportId });
  }

  // Old ratings
  const ratingAOld = playerA.currentRating;
  const ratingBOld = playerB.currentRating;

  // Update ratings
  const ratingANew = updateElo(ratingAOld, ratingBOld, winnerScoreA, playerA.matchesPlayed);
  const ratingBNew = updateElo(ratingBOld, ratingAOld, 1 - winnerScoreA, playerB.matchesPlayed);

  // Update matches played and provisional status
  playerA.matchesPlayed += 1;
  playerB.matchesPlayed += 1;

  if (playerA.matchesPlayed >= 10) playerA.provisional = false;
  if (playerB.matchesPlayed >= 10) playerB.provisional = false;

  // Save new ratings
  playerA.currentRating = ratingANew;
  playerB.currentRating = ratingBNew;

  await playerA.save();
  await playerB.save();

  // Log to RatingHistory
  await RatingHistory.create({
    userId: playerAId,
    sportId,
    matchId,
    previousRating: ratingAOld,
    newRating: ratingANew,
    ratingChange: ratingANew - ratingAOld,
  });

  await RatingHistory.create({
    userId: playerBId,
    sportId,
    matchId,
    previousRating: ratingBOld,
    newRating: ratingBNew,
    ratingChange: ratingBNew - ratingBOld,
  });

  return {
    playerA: { old: ratingAOld, new: ratingANew },
    playerB: { old: ratingBOld, new: ratingBNew },
  };
}

module.exports = { updateRatings };