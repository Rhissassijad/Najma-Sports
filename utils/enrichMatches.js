const UserSport = require("../models/userSport");
const RatingHistory = require("../models/RatingHistory");

const enrichMatches = async (matches) => {
  if (matches.length === 0) return matches;

  const playerIds = [...new Set(matches.flatMap((match) => match.players.map((player) => (
    player._id || player
  ).toString())))];
  const matchIds = matches.map((match) => match._id);
  const sportIds = [...new Set(matches.map((match) => (
    match.sport?._id || match.sport
  ).toString()))];

  const [ratings, ratingHistory] = await Promise.all([
    UserSport.find({
      userId: { $in: playerIds },
      sportId: { $in: sportIds },
    }),
    RatingHistory.find({
      userId: { $in: playerIds },
      matchId: { $in: matchIds },
    }),
  ]);

  const ratingByPlayerSport = new Map(
    ratings.map((rating) => [
      `${rating.userId.toString()}:${rating.sportId.toString()}`,
      rating.currentRating,
    ])
  );
  const changeByPlayerMatch = new Map(
    ratingHistory.map((entry) => [
      `${entry.userId.toString()}:${entry.matchId.toString()}`,
      entry.ratingChange,
    ])
  );

  return matches.map((match) => {
    const matchObject = match.toObject();
    const sportId = (match.sport?._id || match.sport).toString();

    return {
      ...matchObject,
      players: match.players.map((player) => {
        const playerObject = player.toObject ? player.toObject() : player;
        const playerId = (player._id || player).toString();
        return {
          ...playerObject,
          rating: ratingByPlayerSport.get(`${playerId}:${sportId}`) ?? null,
          ratingChange: changeByPlayerMatch.get(`${playerId}:${match._id}`) ?? null,
        };
      }),
    };
  });
};

module.exports = enrichMatches;
