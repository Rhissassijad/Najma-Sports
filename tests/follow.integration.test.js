const test = require("node:test"),
  assert = require("node:assert/strict"),
  mongoose = require("mongoose"),
  crypto = require("node:crypto"),
  jwt = require("jsonwebtoken");
const User = require("../models/User");
const uri = process.env.SOCCER_TEST_MONGO_URI;
test(
  "production app: follow/unfollow persists both sides, is idempotent and keeps team routes reachable",
  { skip: !uri && "Set localhost replica-set test URI." },
  async (t) => {
    assert(["localhost", "127.0.0.1"].includes(new URL(uri).hostname));
    await mongoose.connect(uri, {
      dbName: "najma_follow_test_" + crypto.randomBytes(6).toString("hex"),
    });
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    const server = require("../app").listen(0, "127.0.0.1");
    await new Promise((r) => server.on("listening", r));
    t.after(async () => {
      await new Promise((r) => server.close(r));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function req(token, path, body, status = 200) {
      const res = await fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = await res.json();
      assert.equal(res.status, status, JSON.stringify(result));
      return result;
    }
    const users = [];
    for (let i = 0; i < 2; i++) {
      const reg = await req(
        "",
        "/auth/register",
        {
          firstName: "Follow",
          lastName: String(i),
          email: `follow${i}@example.test`,
          phoneCountry: "US",
          phoneNumber: "1234567890",
          gender: "Prefer not to say",
          dateOfBirth: "2000-01-01",
          password: "test-password",
        },
        201,
      );
      users.push({
        id: jwt.verify(reg.token, process.env.JWT_SECRET).id,
        token: reg.token,
      });
    }
    const [a, b] = users;
    await req(a.token, `/users/${a.id}/follow`, {}, 400);
    await req(a.token, "/users/not-an-id/follow", {}, 400);
    await req(
      a.token,
      `/users/${new mongoose.Types.ObjectId()}/follow`,
      {},
      404,
    );
    await req(a.token, `/users/${b.id}/follow`, { following: "yes" }, 400);
    assert.equal(
      (await req(a.token, `/users/${b.id}/follow`, { following: true }))
        .following,
      true,
    );
    await Promise.all(
      [0, 1].map(() =>
        req(a.token, `/users/${b.id}/follow`, { following: true }),
      ),
    );
    let me = await req(a.token, "/users/me", undefined),
      target = await req(b.token, "/users/me", undefined);
    assert.deepEqual(me.followingIds, [b.id]);
    assert.equal(me.followingCount, 1);
    assert.equal(target.followersCount, 1);
    assert.equal(
      (await req(a.token, `/users/${b.id}/follow`, { following: false }))
        .following,
      false,
    );
    await req(a.token, `/users/${b.id}/follow`, { following: false });
    me = await req(a.token, "/users/me", undefined);
    target = await req(b.token, "/users/me", undefined);
    assert.deepEqual(me.followingIds, []);
    assert.equal(target.followersCount, 0);
    assert.equal(
      (await req(a.token, `/users/${b.id}/follow`, {})).following,
      true,
    );
    assert.equal(
      (await req(a.token, `/users/${b.id}/follow`, {})).following,
      false,
    );
    const teams = await req(
      a.token,
      "/team-sports?sport=Basketball",
      undefined,
    );
    assert(Array.isArray(teams.squads));
    assert.equal(
      (await req(a.token, "/health", undefined)).features.following,
      true,
    );
    assert.equal((await User.findById(b.id)).followers.length, 0);
  },
);
