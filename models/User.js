const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    name: { type: String, required: true },
    nationality: { type: String, default: "" },
    city: { type: String, default: "", trim: true },
    email: { type: String, required: true, unique: true },
    phoneCountry: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    height: { type: Number },
    weight: { type: Number },
    favoritePlayer: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    soccer: {
      position: {
        type: String,
        enum: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
      },
      foot: { type: String, enum: ["Left", "Right", "Both"] },
    },
    onboarding: {
      category: {
        type: String,
        enum: ["individual", "team", "both"],
        default: "both",
      },
      intent: {
        type: String,
        enum: ["player", "manage", "join"],
        default: "player",
      },
    },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
