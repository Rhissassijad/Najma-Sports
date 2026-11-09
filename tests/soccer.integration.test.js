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
  "team competition API: all sports, memberships, stats, atomic Elo, legacy soccer and social categories",
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
    app.use("/api/team-sports", require("../routes/teamSportsRoutes"));
    app.use("/api/feed", require("../routes/feedRoutes"));
    app.use("/api/communities", require("../routes/communityRoutes"));
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
    const { catalog, teamSports } = require("../utils/sports");
    for (const sport of teamSports) {
      const d = catalog.team[sport];
      const root = "/api/team-sports";
      const path = (p) => root + p + "?sport=" + encodeURIComponent(sport);
      const h = await request(
        a.token,
        path("/squads"),
        { name: sport + " Home", format: d.formats[0] },
        201,
      );
      const v = await request(
        b.token,
        path("/squads"),
        { name: sport + " Away", format: d.formats[0] },
        201,
      );
      for (const [manager, member, squad] of [
        [a, p, h],
        [b, x, v],
      ]) {
        await request(manager.token, path(`/squads/${squad._id}/membership`), {
          action: "invite",
          email: member.email,
        });
        await request(member.token, path(`/squads/${squad._id}/membership`), {
          action: "accept",
          playerId: member.id,
        });
      }
      await request(
        p.token,
        path("/profile"),
        { position: d.positions[0], side: "Left" },
        200,
        "PATCH",
      );
      if (sport !== "Soccer")
        await request(
          a.token,
          path("/matches"),
          { home: h._id, away: away._id, mode: "results", scheduledAt: date },
          400,
        );
      const game = await request(
        a.token,
        path("/matches"),
        { home: h._id, away: v._id, mode: "detailed", scheduledAt: date },
        201,
      );
      const action = (kind) => path(`/matches/${game._id}/${kind}`);
      await request(b.token, action("accept"), {});
      const stats = Object.fromEntries(
        [d.participation, ...d.metrics].map((m) => [m.key, 0]),
      );
      stats[d.participation.key] = 1;
      stats[d.metrics[0].key] = 1;
      await request(a.token, action("lineup"), {
        players: [{ user: p.id, position: d.positions[0], stats }],
      });
      await request(b.token, action("lineup"), {
        players: [
          {
            user: x.id,
            position: d.positions[0],
            stats: { [d.participation.key]: 1 },
          },
        ],
      });
      if (!d.allowDraw)
        await request(
          a.token,
          action("result"),
          { homeScore: 1, awayScore: 1 },
          400,
        );
      const hs = sport === "Volleyball" ? 3 : sport === "Football" ? 14 : 2;
      await request(a.token, action("result"), { homeScore: hs, awayScore: 0 });
      await request(b.token, action("confirm"), {});
      const profile = await request(
        p.token,
        path(`/players/${p.id}`),
        undefined,
      );
      assert.equal(profile.player.teamProfile.position, d.positions[0]);
      assert(profile.appearances.some((r) => r.matchId === game._id));
      assert(profile.squads.some((q) => q._id === h._id));
      const listing = await request(a.token, path(""), undefined);
      assert(listing.squads.every((q) => q.sport === sport));
      assert(listing.matches.every((m) => m.sport === sport));
      const community = await request(
        a.token,
        "/api/communities",
        { name: sport + " club community", sport },
        201,
      );
      assert.equal(community.sport, sport);
      const post = await request(
        a.token,
        "/api/feed/posts",
        {
          text: sport + " match update",
          sportTag: sport,
          communityId: community._id,
        },
        201,
      );
      assert.equal(post.sportTag, sport);
      await request(
        b.token,
        `/api/communities/${community._id}`,
        { sport: "Tennis" },
        403,
        "PATCH",
      );
      const updated = await request(
        a.token,
        `/api/communities/${community._id}`,
        { sport: "Tennis" },
        200,
        "PATCH",
      );
      assert.equal(updated.sport, "Tennis");
      const edit = await request(
        a.token,
        `/api/feed/posts/${post._id}`,
        { sportTag: "Basketball" },
        200,
        "PUT",
      );
      assert.equal(edit.sportTag, "Basketball");
    }
    const allSports = await request(
      p.token,
      "/api/team-sports/participation",
      undefined,
    );
    assert.equal(allSports.sports.length, 7);
    const legacy = home.toObject ? home.toObject() : { ...home };
    delete legacy.sport;
    delete legacy._id;
    delete legacy.__v;
    const raw = await Squad.collection.insertOne({
      ...legacy,
      name: "Legacy soccer",
      manager: new mongoose.Types.ObjectId(a.id),
      format: "11",
      members: [],
    });
    const listing = await request(a.token, "/api/team-sports", undefined);
    assert(
      listing.squads.some(
        (q) => q._id === String(raw.insertedId) && q.sport === "Soccer",
      ),
    );
  },
);
