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

userSportSchema.index({ userId: 1, sportId: 1 }, { unique: true });

module.exports = mongoose.model("UserSport", userSportSchema);