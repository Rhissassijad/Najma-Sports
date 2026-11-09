const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  console.log("REGISTER ROUTE HIT");
  const {
    firstName,
    lastName,
    email,
    phoneCountry,
    phoneNumber,
    gender,
    dateOfBirth,
    password,
  } = req.body;

  try {
    const onboarding = req.body.onboarding || {
      category: "both",
      intent: "player",
    };
    if (
      !["individual", "team", "both"].includes(onboarding.category) ||
      !["player", "manage", "join"].includes(onboarding.intent)
    ) {
      return res
        .status(400)
        .json({ message: "Choose valid sport and participation preferences." });
    }
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const trimmedFirstName = String(firstName || "").trim();
    const trimmedLastName = String(lastName || "").trim();
    const normalizedPhoneCountry = String(phoneCountry || "")
      .trim()
      .toUpperCase();
    const trimmedPhoneNumber = String(phoneNumber || "").trim();
    const trimmedGender = String(gender || "").trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !normalizedEmail ||
      !normalizedPhoneCountry ||
      !trimmedPhoneNumber ||
      !trimmedGender ||
      !dateOfBirth ||
      !password
    ) {
      return res
        .status(400)
        .json({
          message: "All required registration fields must be provided.",
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(trimmedPhoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    if (!/^[A-Z]{2}$/.test(normalizedPhoneCountry)) {
      return res.status(400).json({ message: "Invalid phone country/region." });
    }

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return res.status(400).json({ message: "Invalid date of birth." });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) return res.status(400).json({ message: "User exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      name: `${trimmedFirstName} ${trimmedLastName}`,
      email: normalizedEmail,
      phoneCountry: normalizedPhoneCountry,
      phoneNumber: trimmedPhoneNumber,
      gender: trimmedGender,
      dateOfBirth: dob,
      password: hashedPassword,
      onboarding,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
