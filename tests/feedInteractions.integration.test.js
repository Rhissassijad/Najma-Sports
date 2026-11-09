const test = require("node:test"),
  assert = require("node:assert/strict"),
  mongoose = require("mongoose"),
  crypto = require("node:crypto"),
  jwt = require("jsonwebtoken");
const { allSports } = require("../utils/sports");
const Sport = require("../models/Sport"),
  Post = require("../models/FeedPost"),
  Match = require("../models/Match");
const { TeamSquad, TeamMatch } = require("../models/TeamSports");
const { Reaction, Comment, Challenge } = require("../models/FeedInteraction");
const uri = process.env.SOCCER_TEST_MONGO_URI;
test(
  "production feed interactions: reactions, comments, private sharing, accepted challenges and cleanup",
  { skip: !uri && "Set localhost replica-set test URI." },
  async (t) => {
    assert(["127.0.0.1", "localhost"].includes(new URL(uri).hostname));
    await mongoose.connect(uri, {
      dbName: "najma_feed_test_" + crypto.randomBytes(6).toString("hex"),
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
    await Sport.insertMany(allSports.map((name) => ({ name })));
    const users = [];
    for (let i = 0; i < 3; i++) {
      const reg = await req(
        null,
        "/auth/register",
        {
          firstName: "Social",
          lastName: String(i),
          email: `social${i}@example.test`,
          phoneCountry: "US",
          phoneNumber: "1234567890",
          gender: "Prefer not to say",
          dateOfBirth: "2000-01-01",
          password: "test-password",
        },
        201,
      );
      users.push({
        token: reg.token,
        id: jwt.verify(reg.token, process.env.JWT_SECRET).id,
      });
    }
    const [a, b, c] = users;
    const post = await req(
      a.token,
      "/feed/posts",
      {
        text: "Public tennis invitation",
        sportTag: "Tennis",
        discipline: "singles",
      },
      201,
    );
    const path = `/feed/posts/${post._id}`;
    await req(null, path + "/reaction", { reaction: "like" }, 401);
    await req(b.token, path + "/reaction", { reaction: "love" }, 400);
    await req(b.token, path + "/reaction", { reaction: "like" });
    let r = await req(b.token, path + "/reaction", { reaction: "like" });
    assert.equal(r.likes, 1);
    r = await req(b.token, path + "/reaction", { reaction: "dislike" });
    assert.equal(r.likes, 0);
    assert.equal(r.dislikes, 1);
    assert.equal(r.myReaction, "dislike");
    await req(b.token, path + "/reaction", { reaction: null });
    await Promise.all(
      [b, c].map((u) => req(u.token, path + "/reaction", { reaction: "like" })),
    );
    const publicView = await req(null, path, undefined);
    assert.equal(publicView.likes, 2);
    assert.equal(publicView.myReaction, null);
    assert.equal(await Reaction.countDocuments({ post: post._id }), 2);
    await req(b.token, path + "/comments", { text: "   " }, 400);
    const comment = await req(
      b.token,
      path + "/comments",
      { text: "Ready to play!" },
      201,
    );
    assert.equal(comment.commentCount, 1);
    assert.equal(
      (await req(null, path + "/comments", undefined)).comments.length,
      1,
    );
    await req(
      c.token,
      path + "/comments/" + comment.comment._id,
      {},
      403,
      "DELETE",
    );
    await req(
      a.token,
      path + "/comments/" + comment.comment._id,
      {},
      200,
      "DELETE",
    );
    assert.equal((await req(a.token, path, undefined)).commentCount, 0);
    const community = await req(
      a.token,
      "/communities",
      { name: "Private sports room", sport: "Tennis" },
      201,
    );
    const hidden = await req(
      a.token,
      "/feed/posts",
      {
        text: "Private content",
        sportTag: "Tennis",
        communityId: community._id,
      },
      201,
    );
    for (const suffix of ["", "/comments"])
      await req(b.token, `/feed/posts/${hidden._id}` + suffix, undefined, 403);
    for (const [suffix, body] of [
      ["/reaction", { reaction: "like" }],
      ["/comments", { text: "Hi" }],
      ["/challenges", { discipline: "singles" }],
    ])
      await req(b.token, `/feed/posts/${hidden._id}` + suffix, body, 403);
    assert.equal(
      (await req(a.token, `/feed/posts/${hidden._id}`, undefined)).text,
      "Private content",
    );
    await req(a.token, path + "/challenges", { discipline: "singles" }, 400);
    const invite = await req(
      b.token,
      path + "/challenges",
      { discipline: "singles" },
      201,
    );
    await req(b.token, path + "/challenges", { discipline: "singles" }, 409);
    await req(c.token, `/feed/challenges/${invite._id}/accept`, {}, 403);
    const accepted = await req(
      a.token,
      `/feed/challenges/${invite._id}/accept`,
      {},
    );
    assert(accepted.match);
    assert.equal(
      (await Match.findById(accepted.match)).status,
      "awaiting_result",
    );
    await req(a.token, `/feed/challenges/${invite._id}/accept`, {}, 409);
    assert.equal(await Match.countDocuments(), 1);
    const doubles = await req(
      a.token,
      "/feed/posts",
      { text: "Doubles match", sportTag: "Badminton", discipline: "doubles" },
      201,
    );
    const di = await req(
      b.token,
      `/feed/posts/${doubles._id}/challenges`,
      { discipline: "doubles" },
      201,
    );
    const da = await req(a.token, `/feed/challenges/${di._id}/accept`, {});
    const dm = await Match.findById(da.match);
    assert.equal(dm.status, "open");
    assert.equal(dm.sideSize, 2);
    assert.deepEqual([...dm.sideAssignments], [0, 1]);
    const cancel = await req(
      c.token,
      path + "/challenges",
      { discipline: "singles" },
      201,
    );
    await req(a.token, `/feed/challenges/${cancel._id}/cancel`, {}, 403);
    await req(c.token, `/feed/challenges/${cancel._id}/cancel`, {});
    assert.equal((await Challenge.findById(cancel._id)).status, "cancelled");
    const from = await TeamSquad.create({
      name: "Visitors",
      manager: b.id,
      sport: "Basketball",
      format: "5",
    });
    const to = await TeamSquad.create({
      name: "Hosts",
      manager: a.id,
      sport: "Basketball",
      format: "5",
      members: [{ user: c.id, name: "Social 2", status: "accepted" }],
    });
    const teamPost = await req(
      c.token,
      "/feed/posts",
      { text: "Our basketball squad", sportTag: "Basketball" },
      201,
    );
    const ti = await req(
      b.token,
      `/feed/posts/${teamPost._id}/challenges`,
      { fromSquad: from._id, toSquad: to._id },
      201,
    );
    assert.equal(ti.to, a.id);
    await req(c.token, `/feed/challenges/${ti._id}/accept`, {}, 403);
    const ta = await req(a.token, `/feed/challenges/${ti._id}/accept`, {});
    assert.equal((await TeamMatch.findById(ta.teamMatch)).status, "scheduled");
    const mine = await req(b.token, "/feed/challenges", undefined);
    assert(mine.some((x) => x.match === accepted.match));
    await req(b.token, path + "/comments", { text: "Another comment" }, 201);
    await req(a.token, path, {}, 200, "DELETE");
    assert.equal(await Comment.countDocuments({ post: post._id }), 0);
    assert.equal(await Reaction.countDocuments({ post: post._id }), 0);
    assert(await Match.findById(accepted.match));
  },
);
