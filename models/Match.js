const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    sport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sport",
      required: true,
    },

    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // 🔹 NEW: Optional score system
    score: {
      type: Object, // flexible (basketball, tennis, etc.)
      default: null,
    },

    // 🔹 KEPT: Your current system (DO NOT BREAK)
    winner: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);