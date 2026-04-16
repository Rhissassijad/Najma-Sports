const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneCountry: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  gender: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  password: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
