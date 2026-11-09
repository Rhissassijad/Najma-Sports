const mongoose = require("mongoose");
const schema = new mongoose.Schema(
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
    discipline: { type: String, required: true },
    value: { type: Number, required: true, min: 0.001 },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: {
      type: String,
      enum: ["self-reported", "opponent-confirmed"],
      required: true,
    },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
    recordedAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index(
  { userId: 1, matchId: 1 },
  { unique: true, partialFilterExpression: { matchId: { $type: "objectId" } } },
);
schema.index({ sportId: 1, discipline: 1, value: 1 });
module.exports = mongoose.model("Performance", schema);
