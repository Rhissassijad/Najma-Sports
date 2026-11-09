const Rating = require("../models/userSport");
const History = require("../models/RatingHistory");
const elo = require("./elo");
module.exports = async (match, session) => {
  const records = [];
  for (const userId of match.players) {
    let rating = await Rating.findOne({
      userId,
      sportId: match.sport,
      discipline: match.discipline || "singles",
    }).session(session);
    if (!rating) {
      rating = new Rating({
        userId,
        sportId: match.sport,
        discipline: match.discipline || "singles",
      });
      await rating.save({ session });
    }
    records.push(rating);
  }
  const sides =
    match.sideAssignments?.length === match.players.length
      ? match.sideAssignments
      : [0, 1];
  const averages = [0, 1].map((side) => {
    const rows = records.filter((_, i) => sides[i] === side);
    return rows.reduce((n, r) => n + r.currentRating, 0) / rows.length;
  });
  for (const [i, rating] of records.entries()) {
    const side = sides[i],
      previousRating = rating.currentRating;
    const delta =
      elo(
        averages[side],
        averages[1 - side],
        side === match.winner ? 1 : 0,
        rating.matchesPlayed,
      ) - averages[side];
    rating.currentRating = Number(
      Math.max(0, Math.min(1500, previousRating + delta)).toFixed(2),
    );
    rating.matchesPlayed++;
    rating.provisional = rating.matchesPlayed < 10;
    await rating.save({ session });
    await History.create(
      [
        {
          userId: rating.userId,
          sportId: match.sport,
          discipline: match.discipline || "singles",
          matchId: match._id,
          previousRating,
          newRating: rating.currentRating,
          ratingChange: Number(
            (rating.currentRating - previousRating).toFixed(2),
          ),
        },
      ],
      { session },
    );
  }
};
