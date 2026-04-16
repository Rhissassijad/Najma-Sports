const mongoose = require("mongoose");

const userSportSchema = mongoose.Schema(
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
    currentRating: {
      type: Number,
      default: 800,
    },
    matchesPlayed: {
      type: Number,
      default: 0,
    },
    provisional: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("userSport", userSportSchema);