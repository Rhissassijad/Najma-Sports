const RatingHistory = require("../models/RatingHistory");

const getUserRatingHistory = async (req, res) => {
  try {
    const { userId, sportId } = req.params;

    const query = { userId };
    if (req.query.discipline) query.discipline = req.query.discipline;

    // Optional sport filter
    if (sportId) {
      query.sportId = sportId;
    }

    const history = await RatingHistory.find(query).sort({ createdAt: 1 });

    // 🔥 Clean formatted response
    const formattedHistory = history.map((entry) => ({
      timestamp: entry.createdAt,
      discipline: entry.discipline || "singles",
      sportId: entry.sportId,
      newRating: entry.newRating,
      ratingChange: entry.ratingChange,
      matchId: entry.matchId,
    }));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error("Rating history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUserRatingHistory,
};
