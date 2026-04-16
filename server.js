const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
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
app.use("/api/users", userRoutes);// 👈 KEEP LAST

app.get("/test", (req, res) => {
  res.json({ message: "Backend reachable 🚀" });
});

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(8080, "0.0.0.0", () =>
  console.log("🚀 Server running on http://localhost:8080")
);
  })
  .catch((err) => console.log(err));
