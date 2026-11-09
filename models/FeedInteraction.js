const mongoose = require("mongoose");
const { Schema } = mongoose;
const ref = (model) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
});
const reaction = new Schema(
  {
    post: ref("FeedPost"),
    user: ref("User"),
    reaction: { type: String, enum: ["like", "dislike"], required: true },
  },
  { timestamps: true },
);
reaction.index({ post: 1, user: 1 }, { unique: true });
const comment = new Schema(
  {
    post: ref("FeedPost"),
    author: ref("User"),
    text: { type: String, trim: true, required: true, maxlength: 1000 },
  },
  { timestamps: true },
);
comment.index({ post: 1, _id: -1 });
const challenge = new Schema(
  {
    post: ref("FeedPost"),
    from: ref("User"),
    to: ref("User"),
    sport: { type: String, required: true },
    sportId: ref("Sport"),
    discipline: { type: String, default: "" },
    kind: { type: String, enum: ["individual", "team"], required: true },
    fromSquad: { type: Schema.Types.ObjectId, ref: "TeamSquad", default: null },
    toSquad: { type: Schema.Types.ObjectId, ref: "TeamSquad", default: null },
    context: { type: Schema.Types.Mixed, default: {} },
    venue: { type: String, default: "", maxlength: 120 },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
    match: { type: Schema.Types.ObjectId, ref: "Match" },
    teamMatch: { type: Schema.Types.ObjectId, ref: "TeamMatch" },
  },
  { timestamps: true },
);
challenge.index(
  { post: 1, from: 1, to: 1, discipline: 1, fromSquad: 1, toSquad: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
challenge.index({ to: 1, status: 1, createdAt: -1 });
module.exports = {
  Reaction: mongoose.model("FeedReaction", reaction),
  Comment: mongoose.model("FeedComment", comment),
  Challenge: mongoose.model("FeedChallenge", challenge),
};
