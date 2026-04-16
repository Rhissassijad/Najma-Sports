const mongoose = require("mongoose");

const ratingHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sport",
      required: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
    previousRating: {
      type: Number,
      required: true,
    },
    newRating: {
      type: Number,
      required: true,
    },
    ratingChange: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ THIS LINE IS CRITICAL
module.exports = mongoose.model("RatingHistory", ratingHistorySchema);