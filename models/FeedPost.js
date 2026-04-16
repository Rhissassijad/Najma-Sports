const mongoose = require("mongoose");

const feedPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    sportTag: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    isMatchResult: {
      type: Boolean,
      default: false,
    },
    hasMedia: {
      type: Boolean,
      default: false,
    },
    hasLocation: {
      type: Boolean,
      default: false,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      default: null,
    },
  },
  { timestamps: true }
);

feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ sportTag: 1, createdAt: -1 });
feedPostSchema.index({ community: 1, createdAt: -1 });

module.exports = mongoose.model("FeedPost", feedPostSchema);
