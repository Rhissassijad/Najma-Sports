const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },
    sport: {
      type: String,
      enum: ["General", ...require("../utils/sports").allSports],
      default: "General",
    },
    discipline: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

communitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Community", communitySchema);
