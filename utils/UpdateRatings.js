const calculateElo = require("./elo");
const UserSport = require("../models/userSport");
const RatingHistory = require("../models/RatingHistory");

const DEFAULT_RATING = 800;

const getOrCreateUserSport = async (userId, sportId, session) => {
  let userSport = await UserSport.findOne({ userId, sportId }).session(session);

  if (!userSport) {
    userSport = new UserSport({
      userId,
      sportId,
      currentRating: DEFAULT_RATING,
      matchesPlayed: 0,
      provisional: true,
    });
    await userSport.save({ session });
  }

  return userSport;
};

const updateRatings = async (winnerId, loserId, sportId, matchId, session) => {
  const winnerSport = await getOrCreateUserSport(winnerId, sportId, session);
  const loserSport = await getOrCreateUserSport(loserId, sportId, session);

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

  await winnerSport.save({ session });
  await loserSport.save({ session });

  await RatingHistory.create(
    [
      {
        userId: winnerId,
        sportId,
        matchId,
        previousRating: winnerOld,
        newRating: winnerNew,
        ratingChange: winnerNew - winnerOld,
      },
      {
        userId: loserId,
        sportId,
        matchId,
        previousRating: loserOld,
        newRating: loserNew,
        ratingChange: loserNew - loserOld,
      },
    ],
    { session, ordered: true }
  );
};

module.exports = updateRatings;