const mongoose = require("mongoose");
const { Schema } = mongoose;
const { teamSports, catalog } = require("../utils/sports");
const allPositions = [
  ...new Set(Object.values(catalog.team).flatMap((d) => d.positions)),
];
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
    club: { type: Schema.Types.ObjectId, ref: "TeamClub", default: null },
    manager: ref("User"),
    sport: {
      type: String,
      enum: teamSports,
      default: "Soccer",
      required: true,
    },
    format: {
      type: String,
      enum: ["2", "3", "5", "6", "7", "9", "11"],
      required: true,
    },
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
      enum: allPositions,
      required: true,
    },
    minutes: { type: Number, min: 0, max: 120, default: 0 },
    goals: { type: Number, min: 0, max: 100, default: 0 },
    assists: { type: Number, min: 0, max: 100, default: 0 },
    stats: { type: Map, of: Number, default: {} },
  },
  { _id: false },
);
const matchSchema = new Schema(
  {
    home: ref("TeamSquad"),
    away: ref("TeamSquad"),
    sport: {
      type: String,
      enum: teamSports,
      default: "Soccer",
      required: true,
    },
    format: {
      type: String,
      enum: ["2", "3", "5", "6", "7", "9", "11"],
      required: true,
    },
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
    reporter: { type: Schema.Types.ObjectId, ref: "TeamSquad" },
    ratingBefore: [Number],
    ratingAfter: [Number],
    confirmedAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);
matchSchema.index({ home: 1, createdAt: -1 });
matchSchema.index({ away: 1, createdAt: -1 });
// Keep existing collection names to preserve all previously recorded soccer data.
const TeamClub = mongoose.model("TeamClub", clubSchema, "soccerclubs");
const TeamSquad = mongoose.model("TeamSquad", squadSchema, "soccersquads");
const TeamMatch = mongoose.model("TeamMatch", matchSchema, "soccermatches");
module.exports = {
  TeamClub,
  TeamSquad,
  TeamMatch,
  SoccerClub: TeamClub,
  SoccerSquad: TeamSquad,
  SoccerMatch: TeamMatch,
};
