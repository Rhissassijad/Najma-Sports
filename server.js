const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const Sport = require("./models/Sport");
const { allSports: DEFAULT_SPORTS } = require("./utils/sports");
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

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    return Sport.find({ name: { $in: DEFAULT_SPORTS } })
      .select("name")
      .lean();
  })
  .then(async (existingSports) => {
    const existingNames = new Set(existingSports.map((sport) => sport.name));
    const missingSports = DEFAULT_SPORTS.filter(
      (name) => !existingNames.has(name),
    ).map((name) => ({ name }));

    if (missingSports.length > 0) {
      await Sport.insertMany(missingSports);
    }

    const apiPort = process.env.API_PORT || 8080;
    app.listen(apiPort, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${apiPort}`),
    );
  })
  .catch((err) => {
    console.error("Backend startup failed:", err);
    process.exitCode = 1;
  });
