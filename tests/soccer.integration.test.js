const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { SoccerSquad: Squad, SoccerMatch: Match } = require("../models/Soccer");
const uri = process.env.SOCCER_TEST_MONGO_URI;
// Dedicated localhost database only: never run this destructive test against application data.
test(
  "soccer API: mutual memberships, isolated formats, detailed stats, disputes and atomic Elo",
  {
    skip:
      !uri && "Set SOCCER_TEST_MONGO_URI to a localhost MongoDB replica set.",
  },
  async (t) => {
    const parsed = new URL(uri);
    assert(
      ["127.0.0.1", "localhost"].includes(parsed.hostname),
      "Test database must be local",
    );
    const dbName = "najma_soccer_test_" + crypto.randomBytes(6).toString("hex");
    await mongoose.connect(uri, { dbName });
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    const app = express();
    app.use(express.json());
    app.use("/api/auth", require("../routes/authRoutes"));
    app.use("/api/soccer", require("../routes/soccerRoutes"));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.on("listening", r));
    const base = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => {
      await new Promise((r) => server.close(r));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    async function request(token, path, body, status = 200, method = "POST") {
      const res = await fetch(base + path, {
        method: body === undefined ? "GET" : method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = await res.json();
      assert.equal(res.status, status, JSON.stringify(result));
      return result;
    }
    const users = [];
    for (const [i, intent] of [
      "manage",
      "manage",
      "join",
      "player",
    ].entries()) {
      const body = {
        firstName: "Player",
        lastName: String(i),
        email: `p${i}@example.test`,
        phoneCountry: "US",
        phoneNumber: "1234567890",
        gender: "Prefer not to say",
        dateOfBirth: "2000-01-01",
        password: "local-test-password",
        onboarding: { category: "team", intent },
      };
      const reg = await request(null, "/api/auth/register", body, 201);
      const id = jwt.verify(reg.token, process.env.JWT_SECRET).id;
      users.push({ id, token: reg.token, email: body.email });
    }
    const [a, b, p, x] = users;
    assert.equal((await User.findById(a.id)).onboarding.intent, "manage");
    await request(null, "/api/soccer", undefined, 401);
    const club = await request(
      a.token,
      "/api/soccer/clubs",
      { name: "Club A" },
      201,
    );
    await request(
      b.token,
      "/api/soccer/squads",
      { name: "Wrong club", club: club._id, format: "11" },
      403,
    );
    const home = await request(
      a.token,
      "/api/soccer/squads",
      { name: "Home", club: club._id, format: "11" },
      201,
    );
    const away = await request(
      b.token,
      "/api/soccer/squads",
      { name: "Away", format: "11" },
      201,
    );
    const five = await request(
      b.token,
      "/api/soccer/squads",
      { name: "Five", format: "5" },
      201,
    );
    const membership = (q, action, extra = {}) => ({
      path: `/api/soccer/squads/${q._id}/membership`,
      body: { action, ...extra },
    });
    let m = membership(home, "request");
    await request(p.token, m.path, m.body);
    m = membership(home, "accept", { playerId: p.id });
    await request(p.token, m.path, m.body, 403);
    await request(a.token, m.path, m.body);
    m = membership(home, "invite", { email: a.email });
    await request(a.token, m.path, m.body);
    m = membership(home, "accept", { playerId: a.id });
    await request(a.token, m.path, m.body);
    m = membership(away, "invite", { email: x.email });
    await request(b.token, m.path, m.body);
    m = membership(away, "accept", { playerId: x.id });
    await request(b.token, m.path, m.body, 403);
    await request(x.token, m.path, m.body);
    const date = new Date(Date.now() - 3600000).toISOString();
    await request(
      a.token,
      "/api/soccer/matches",
      { home: home._id, away: five._id, scheduledAt: date, mode: "results" },
      400,
    );
    const match = await request(
      a.token,
      "/api/soccer/matches",
      { home: home._id, away: away._id, scheduledAt: date, mode: "detailed" },
      201,
    );
    const action = (kind) => `/api/soccer/matches/${match._id}/${kind}`;
    await request(a.token, action("accept"), {}, 409);
    await request(b.token, action("accept"), {});
    await request(
      p.token,
      action("result"),
      { homeScore: 1, awayScore: 0 },
      403,
    );
    await request(
      a.token,
      action("result"),
      { homeScore: 1, awayScore: 0 },
      400,
    );
    await request(a.token, action("lineup"), {
      players: [
        { user: p.id, position: "Forward", minutes: 90, goals: 1, assists: 0 },
      ],
    });
    await request(b.token, action("lineup"), {
      players: [
        {
          user: x.id,
          position: "Goalkeeper",
          minutes: 90,
          goals: 0,
          assists: 0,
        },
      ],
    });
    await request(
      a.token,
      action("result"),
      { homeScore: 0, awayScore: 0 },
      400,
    );
    await request(b.token, action("lineup"), {
      players: [
        {
          user: x.id,
          position: "Goalkeeper",
          minutes: 0,
          goals: 0,
          assists: 0,
        },
      ],
    });
    await request(
      a.token,
      action("result"),
      { homeScore: 1, awayScore: 0 },
      400,
    );
    await request(b.token, action("lineup"), {
      players: [
        {
          user: x.id,
          position: "Goalkeeper",
          minutes: 90,
          goals: 0,
          assists: 0,
        },
      ],
    });
    await request(a.token, action("result"), { homeScore: 1, awayScore: 0 });
    await request(a.token, action("confirm"), {}, 409);
    await request(b.token, action("dispute"), {});
    assert.equal((await Squad.findById(home._id)).played, 0);
    await request(a.token, action("result"), { homeScore: 1, awayScore: 0 });
    const confirmations = await Promise.all([
      fetch(base + action("confirm"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${b.token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      fetch(base + action("confirm"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${b.token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    ]);
    assert.deepEqual(confirmations.map((r) => r.status).sort(), [200, 409]);
    const updated = await Squad.findById(home._id);
    assert.equal(updated.rating, 816);
    assert.equal(updated.wins, 1);
    assert.equal(updated.played, 1);
    const profile = await request(
      a.token,
      `/api/soccer/players/${p.id}`,
      undefined,
    );
    assert.equal(profile.appearances.length, 1);
    assert.equal(profile.appearances[0].goals, 1);
    assert.equal(profile.player.email, undefined);
    m = membership(home, "remove", { playerId: p.id });
    await request(a.token, m.path, m.body);
    assert.equal(
      (await request(p.token, `/api/soccer/players/${p.id}`, undefined))
        .appearances.length,
      1,
    );
    const resultOnly = await request(
      a.token,
      "/api/soccer/matches",
      { home: home._id, away: away._id, scheduledAt: date, mode: "results" },
      201,
    );
    for (const [token, kind, body] of [
      [b.token, "accept", {}],
      [a.token, "result", { homeScore: 2, awayScore: 2 }],
      [b.token, "confirm", {}],
    ])
      await request(
        token,
        `/api/soccer/matches/${resultOnly._id}/${kind}`,
        body,
      );
    assert.equal((await Squad.findById(home._id)).played, 2);
    assert.equal(
      (await request(p.token, `/api/soccer/players/${p.id}`, undefined))
        .appearances.length,
      1,
    );
    assert.equal((await Match.findById(match._id)).status, "completed");
  },
);
