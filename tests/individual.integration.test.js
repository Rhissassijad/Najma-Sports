const test = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  mongoose = require("mongoose"),
  express = require("express"),
  jwt = require("jsonwebtoken");
const Sport = require("../models/Sport"),
  Rating = require("../models/userSport"),
  History = require("../models/RatingHistory"),
  Match = require("../models/Match"),
  Performance = require("../models/Performance");
const uri =
  process.env.INDIVIDUAL_TEST_MONGO_URI || process.env.SOCCER_TEST_MONGO_URI;
test(
  "individual disciplines API: migration, doubles consensus, isolated ratings, swimming/golf records and social categories",
  { skip: !uri && "Set a localhost replica-set test URI." },
  async (t) => {
    assert(["127.0.0.1", "localhost"].includes(new URL(uri).hostname));
    await mongoose.connect(uri, {
      dbName: "najma_individual_test_" + crypto.randomBytes(6).toString("hex"),
    });
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    const app = express();
    app.use(express.json());
    for (const [path, file] of [
      ["auth", "authRoutes"],
      ["matches", "matchRoutes"],
      ["users", "userRoutes"],
      ["sports", "sportRoutes"],
      ["individual", "individualRoutes"],
      ["leaderboard", "leaderboardRoutes"],
      ["feed", "feedRoutes"],
      ["communities", "communityRoutes"],
    ])
      app.use("/api/" + path, require("../routes/" + file));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.on("listening", r));
    t.after(async () => {
      await new Promise((r) => server.close(r));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function req(token, path, body, status = 200, method = "POST") {
      const r = await fetch(base + path, {
        method: body === undefined ? "GET" : method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await r.json();
      assert.equal(r.status, status, JSON.stringify(data));
      return data;
    }
    const users = [];
    for (let i = 0; i < 4; i++) {
      const r = await req(
        null,
        "/auth/register",
        {
          firstName: "Player",
          lastName: String(i),
          email: `p${i}@example.test`,
          phoneCountry: "US",
          phoneNumber: "1234567890",
          gender: "Prefer not to say",
          dateOfBirth: "2000-01-01",
          password: "local-test-pass",
        },
        201,
      );
      users.push({
        token: r.token,
        id: jwt.verify(r.token, process.env.JWT_SECRET).id,
      });
    }
    const [a, b, c, d] = users;
    const sports = await Sport.insertMany(
      require("../utils/sports").allSports.map((name) => ({ name })),
    );
    const sport = (name) => String(sports.find((s) => s.name === name)._id);
    const badminton = sport("Badminton");
    // Reproduce the old unique-index layout and old records without a discipline.
    await Rating.collection.insertOne({
      userId: new mongoose.Types.ObjectId(a.id),
      sportId: new mongoose.Types.ObjectId(badminton),
      currentRating: 910,
      matchesPlayed: 4,
      provisional: true,
    });
    await Rating.collection.createIndex(
      { userId: 1, sportId: 1 },
      { unique: true },
    );
    const migrate = require("../utils/migrateDisciplines");
    await migrate();
    await migrate();
    assert.equal(
      (
        await Rating.findOne({
          userId: a.id,
          sportId: badminton,
          discipline: "singles",
        })
      ).currentRating,
      910,
    );
    assert(
      !(await Rating.collection.indexes()).some(
        (i) => Object.keys(i.key).length === 2 && i.unique,
      ),
    );
    await req(a.token, "/users/me/sports", {
      sportId: badminton,
      discipline: "doubles",
    });
    await req(
      a.token,
      "/matches",
      { sport: badminton, discipline: "invalid" },
      400,
    );
    const match = await req(
      a.token,
      "/matches",
      { sport: badminton, discipline: "doubles" },
      201,
    );
    assert.equal(match.sideSize, 2);
    await req(
      a.token,
      `/matches/${match._id}/result`,
      { score: { type: "standard", points: [21, 18] } },
      409,
    );
    await req(b.token, `/matches/${match._id}/join`, { side: 0 });
    await req(c.token, `/matches/${match._id}/join`, { side: 0 }, 409);
    await req(c.token, `/matches/${match._id}/join`, { side: 1 });
    await req(d.token, `/matches/${match._id}/join`, { side: 1 });
    await req(a.token, `/matches/${match._id}/join`, { side: 1 }, 409);
    await req(a.token, `/matches/${match._id}/result`, {
      score: {
        type: "sets",
        sets: [
          [21, 18],
          [21, 16],
        ],
      },
    });
    await req(a.token, `/matches/${match._id}/confirm-result`, {}, 409);
    await req(b.token, `/matches/${match._id}/confirm-result`, {});
    await req(c.token, `/matches/${match._id}/confirm-result`, {});
    assert.equal(await History.countDocuments({ matchId: match._id }), 0);
    const confirms = await Promise.all(
      [0, 1].map(() =>
        fetch(base + `/matches/${match._id}/confirm-result`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${d.token}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
      ),
    );
    assert.deepEqual(confirms.map((r) => r.status).sort(), [200, 409]);
    assert.equal(await History.countDocuments({ matchId: match._id }), 4);
    assert.equal(
      (
        await Rating.findOne({
          userId: a.id,
          sportId: badminton,
          discipline: "singles",
        })
      ).currentRating,
      910,
    );
    assert.equal(
      (
        await Rating.findOne({
          userId: a.id,
          sportId: badminton,
          discipline: "doubles",
        })
      ).currentRating,
      825,
    );
    const singleBoard = await req(
      a.token,
      `/leaderboard/${badminton}?discipline=singles`,
      undefined,
    );
    const doubleBoard = await req(
      a.token,
      `/leaderboard/${badminton}?discipline=doubles`,
      undefined,
    );
    assert.equal(singleBoard.length, 1);
    assert.equal(doubleBoard.length, 4);
    assert(doubleBoard.every((r) => r.discipline === "doubles"));
    const swimming = sport("Swimming"),
      event = "50m-freestyle-25m",
      long = "50m-freestyle-50m",
      date = "2026-01-01T00:00:00Z";
    const self = await req(
      a.token,
      "/individual/performances",
      {
        sportId: swimming,
        discipline: event,
        value: 24.5,
        recordedAt: date,
        source: "opponent-confirmed",
      },
      201,
    );
    assert.equal(self.source, "self-reported");
    await req(
      a.token,
      "/individual/performances",
      { sportId: swimming, discipline: long, value: 23, recordedAt: date },
      201,
    );
    await req(
      a.token,
      "/individual/performances",
      { sportId: swimming, discipline: event, value: 0, recordedAt: date },
      400,
    );
    let board = await req(
      a.token,
      `/individual/leaderboard?sportId=${swimming}&discipline=${event}&source=self-reported`,
      undefined,
    );
    assert.equal(board.length, 1);
    assert.equal(board[0].value, 24.5);
    await req(
      b.token,
      "/individual/performances/" + self._id,
      {},
      403,
      "DELETE",
    );
    const race = await req(
      a.token,
      "/matches",
      { sport: swimming, discipline: event },
      201,
    );
    await req(b.token, `/matches/${race._id}/join`, { side: 1 });
    await req(a.token, `/matches/${race._id}/result`, {
      score: { values: [25.1, 24.9] },
    });
    await req(b.token, `/matches/${race._id}/confirm-result`, {});
    assert.equal((await Match.findById(race._id)).winner, 1);
    assert.equal(await Rating.countDocuments({ sportId: swimming }), 0);
    board = await req(
      a.token,
      `/individual/leaderboard?sportId=${swimming}&discipline=${event}`,
      undefined,
    );
    assert.equal(board.length, 2);
    assert.equal(board[0].value, 24.9);
    assert(board.every((r) => r.source === "opponent-confirmed"));
    assert.equal(await Performance.countDocuments({ matchId: race._id }), 2);
    const golf = sport("Golf"),
      ctx = { course: "Riverside City", tees: "Blue", par: 72 };
    await req(
      a.token,
      "/individual/performances",
      { sportId: golf, discipline: "stroke-18", value: 72, recordedAt: date },
      400,
    );
    await req(
      a.token,
      "/individual/performances",
      {
        sportId: golf,
        discipline: "stroke-18",
        value: 72.5,
        recordedAt: date,
        context: ctx,
      },
      400,
    );
    await req(
      a.token,
      "/individual/performances",
      {
        sportId: golf,
        discipline: "stroke-18",
        value: 72,
        recordedAt: date,
        context: ctx,
      },
      201,
    );
    await req(
      b.token,
      "/individual/performances",
      {
        sportId: golf,
        discipline: "stroke-18",
        value: 65,
        recordedAt: date,
        context: { ...ctx, course: "Another course" },
      },
      201,
    );
    board = await req(
      a.token,
      `/individual/leaderboard?${new URLSearchParams({ sportId: golf, discipline: "stroke-18", source: "self-reported", course: "riverside city", tees: "blue", par: "72" })}`,
      undefined,
    );
    assert.equal(board.length, 1);
    assert.equal(board[0].value, 72);
    for (const name of ["Badminton", "Table Tennis", "Swimming", "Golf"]) {
      const discipline = require("../utils/individualSports").list(name)[0].id;
      const community = await req(
        a.token,
        "/communities",
        { name: name + " events", sport: name, discipline },
        201,
      );
      assert.equal(community.discipline, discipline);
      const post = await req(
        a.token,
        "/feed/posts",
        {
          text: "Event result",
          sportTag: name,
          discipline,
          communityId: community._id,
        },
        201,
      );
      assert.equal(post.discipline, discipline);
      await req(
        a.token,
        "/feed/posts",
        { text: "Wrong event", sportTag: name, discipline: "not-a-discipline" },
        400,
      );
      const edited = await req(
        a.token,
        "/feed/posts/" + post._id,
        { sportTag: "Soccer" },
        200,
        "PUT",
      );
      assert.equal(edited.discipline, "");
    }
    const best = await req(
      a.token,
      `/individual/personal-bests?sportId=${swimming}&discipline=${event}`,
      undefined,
    );
    assert.equal(best.find((r) => r.source === "self-reported").value, 24.5);
    const golfMatch = await req(
      a.token,
      "/matches",
      { sport: golf, discipline: "stroke-18", context: ctx },
      201,
    );
    await req(b.token, `/matches/${golfMatch._id}/join`, { side: 1 });
    await req(a.token, `/matches/${golfMatch._id}/result`, {
      score: { values: [72, 75] },
    });
    await req(b.token, `/matches/${golfMatch._id}/confirm-result`, {});
    assert.equal((await Match.findById(golfMatch._id)).winner, 0);
    assert.equal(await Rating.countDocuments({ sportId: golf }), 0);
    const profile = await req(a.token, "/users/me", undefined);
    assert(
      profile.ratings.some((r) => r.discipline === "singles") &&
        profile.ratings.some((r) => r.discipline === "doubles"),
    );
  },
);
