const calculateElo = require("./elo");
const UserSport = require("../models/UserSport");
const RatingHistory = require("../models/RatingHistory");

const DEFAULT_RATING = 750;

const getOrCreateUserSport = async (userId, sportId) => {
  let userSport = await UserSport.findOne({ userId, sportId });

  if (!userSport) {
    userSport = await UserSport.create({
      userId,
      sportId,
      currentRating: DEFAULT_RATING,
      matchesPlayed: 0,
      provisional: true,
    });
  }

  return userSport;
};

const updateRatings = async (winnerId, loserId, sportId, matchId) => {
  // 🔥 AUTO-CREATE if not exists
  const winnerSport = await getOrCreateUserSport(winnerId, sportId);
  const loserSport = await getOrCreateUserSport(loserId, sportId);

  const winnerOld = winnerSport.currentRating;
  const loserOld = loserSport.currentRating;

  const winnerNew = calculateElo(
    winnerOld,
    loserOld,
    1,
    winnerSport.matchesPlayed
  );

  const loserNew = calculateElo(
    loserOld,
    winnerOld,
    0,
    loserSport.matchesPlayed
  );

  // Update ratings
  winnerSport.currentRating = winnerNew;
  loserSport.currentRating = loserNew;

  winnerSport.matchesPlayed += 1;
  loserSport.matchesPlayed += 1;

  if (winnerSport.matchesPlayed >= 10) winnerSport.provisional = false;
  if (loserSport.matchesPlayed >= 10) loserSport.provisional = false;

  await winnerSport.save();
  await loserSport.save();

  // Save history
  await RatingHistory.create({
    userId: winnerId,
    sportId,
    matchId,
    previousRating: winnerOld,
    newRating: winnerNew,
    ratingChange: winnerNew - winnerOld,
  });

  await RatingHistory.create({
    userId: loserId,
    sportId,
    matchId,
    previousRating: loserOld,
    newRating: loserNew,
    ratingChange: loserNew - loserOld,
  });
};

module.exports = updateRatings;