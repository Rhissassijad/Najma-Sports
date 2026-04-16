const UserSport = require("../models/UserSport");

const getUpdatedRatings = async (players, sportId) => {
  const userSports = await UserSport.find({
    userId: { $in: players },
    sportId,
  });

  return userSports.map((us) => ({
    userId: us.userId,
    rating: us.currentRating,
    matchesPlayed: us.matchesPlayed,
    provisional: us.provisional,
  }));
};

module.exports = getUpdatedRatings;