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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "awaiting_result", "awaiting_confirmation", "completed"],
      default: "open",
      required: true,
    },

    score: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    proposedScore: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    resultReporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    venue: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      trim: true,
      default: "Competitive",
    },

    winner: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);