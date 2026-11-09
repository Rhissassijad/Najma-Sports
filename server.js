const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const app = require("./app");
const Sport = require("./models/Sport");
const { allSports: DEFAULT_SPORTS } = require("./utils/sports");

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

    await require("./utils/migrateDisciplines")();
    await Promise.all(
      Object.values(require("./models/FeedInteraction")).map((model) =>
        model.init(),
      ),
    );
    const apiPort = process.env.API_PORT || 8080;
    const server = app.listen(apiPort, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${apiPort}`),
    );
    server.on("error", (error) => {
      console.error(
        error.code === "EADDRINUSE"
          ? `API port ${apiPort} is already in use. Stop the older backend process before restarting.`
          : "API startup failed.",
      );
      process.exitCode = 1;
      void mongoose.disconnect();
    });
  })
  .catch((err) => {
    console.error("Backend startup failed:", err);
    process.exitCode = 1;
  });
