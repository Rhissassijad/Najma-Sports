const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ✅ IMPORTANT: handle preflight requests
app.use(express.json());

// 🔥 GLOBAL REQUEST LOGGER (VERY IMPORTANT FOR DEBUG)
app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.url);
  next();
});

// ✅ TEST ROOT ROUTE
app.get("/", (req, res) => {
  res.send("Server is working");
});

// Capability check for diagnosing an old API process or the wrong API URL.
app.get("/api/health", (req, res) =>
  res.json({
    status: mongoose.connection.readyState === 1 ? "ready" : "starting",
    features: {
      teamSports: true,
      following: true,
      individualDisciplines: true,
    },
  }),
);

// Routes
const matchRoutes = require("./routes/matchRoutes");
const sportRoutes = require("./routes/sportRoutes");
const authRoutes = require("./routes/authRoutes");
const communityRoutes = require("./routes/communityRoutes");
const feedRoutes = require("./routes/feedRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const userRoutes = require("./routes/userRoutes");

// ⚠️ ORDER MATTERS
app.use("/api/matches", matchRoutes);
app.use("/api/individual", require("./routes/individualRoutes"));
app.use("/api/sports", sportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/soccer", require("./routes/soccerRoutes"));
app.use("/api/team-sports", require("./routes/teamSportsRoutes"));

app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ message: `API route not found: ${req.method} ${req.path}` });
});

app.get("/test", (req, res) => {
  res.json({ message: "Backend reachable 🚀" });
});

module.exports = app;
