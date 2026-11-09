const mongoose = require("mongoose");
const { Schema } = mongoose;
const ref = (model) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
});
const clubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    owner: ref("User"),
  },
  { timestamps: true },
);
const memberSchema = new Schema(
  {
    user: ref("User"),
    name: String,
    status: {
      type: String,
      enum: ["requested", "invited", "accepted", "declined", "left"],
      required: true,
    },
    joinedAt: Date,
    leftAt: Date,
  },
  { _id: false },
);
const squadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    club: { type: Schema.Types.ObjectId, ref: "SoccerClub", default: null },
    manager: ref("User"),
    format: { type: String, enum: ["5", "7", "11"], required: true },
    members: [memberSchema],
    rating: { type: Number, default: 800 },
    played: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
  },
  { timestamps: true, optimisticConcurrency: true },
);
const lineSchema = new Schema(
  {
    user: ref("User"),
    name: String,
    position: {
      type: String,
      enum: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
      required: true,
    },
    minutes: { type: Number, min: 0, max: 120, required: true },
    goals: { type: Number, min: 0, max: 100, default: 0 },
    assists: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
);
const matchSchema = new Schema(
  {
    home: ref("SoccerSquad"),
    away: ref("SoccerSquad"),
    format: { type: String, enum: ["5", "7", "11"], required: true },
    status: {
      type: String,
      enum: [
        "challenge",
        "scheduled",
        "awaiting_confirmation",
        "disputed",
        "completed",
        "declined",
      ],
      default: "challenge",
    },
    scheduledAt: { type: Date, required: true },
    venue: { type: String, maxlength: 120, default: "" },
    mode: { type: String, enum: ["results", "detailed"], default: "results" },
    homeLineup: [lineSchema],
    awayLineup: [lineSchema],
    homeScore: Number,
    awayScore: Number,
    reporter: { type: Schema.Types.ObjectId, ref: "SoccerSquad" },
    ratingBefore: [Number],
    ratingAfter: [Number],
    confirmedAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);
matchSchema.index({ home: 1, createdAt: -1 });
matchSchema.index({ away: 1, createdAt: -1 });
module.exports = {
  SoccerClub: mongoose.model("SoccerClub", clubSchema),
  SoccerSquad: mongoose.model("SoccerSquad", squadSchema),
  SoccerMatch: mongoose.model("SoccerMatch", matchSchema),
};
