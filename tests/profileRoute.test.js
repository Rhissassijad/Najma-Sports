const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const UserSport = require("../models/userSport");
const Match = require("../models/Match");
const RatingHistory = require("../models/RatingHistory");
const userRoutes = require("../routes/userRoutes");

const query = (value) => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

test("GET /me loads each profile data source and returns the full payload", async (t) => {
  const originals = {
    findById: User.findById,
    userSportFind: UserSport.find,
    matchFind: Match.find,
    ratingHistoryFind: RatingHistory.find,
  };
  t.after(() => {
    User.findById = originals.findById;
    UserSport.find = originals.userSportFind;
    Match.find = originals.matchFind;
    RatingHistory.find = originals.ratingHistoryFind;
  });

  const queryCalls = { sports: [], matches: [], history: [] };
  const profileUser = { _id: "user-1", name: "Player" };
  const rating = { _id: "rating-1", userId: "user-1", sportId: "sport-1" };
  const historyEntry = {
    _id: "history-1",
    userId: "user-1",
    matchId: "match-1",
    sportId: "sport-1",
  };

  User.findById = (id) => ({
    async select(selection) {
      assert.equal(id, "user-1");
      assert.equal(selection, "-password");
      return profileUser;
    },
  });
  UserSport.find = (filter) => {
    queryCalls.sports.push(filter);
    return query(filter.userId === "user-1" ? [rating] : []);
  };
  Match.find = (filter) => {
    queryCalls.matches.push(filter);
    return query(filter.$or[0].status === "completed" ? [] : []);
  };
  RatingHistory.find = (filter) => {
    queryCalls.history.push(filter);
    return query(filter.userId === "user-1" ? [historyEntry] : []);
  };

  const meRoute = userRoutes.stack.find(
    (layer) => layer.route?.path === "/me" && layer.route.methods.get
  );
  assert.ok(meRoute, "GET /me route should be registered");

  let responseStatus = 200;
  let responseBody;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await meRoute.route.stack.at(-1).handle(
    { user: { id: "user-1" } },
    response
  );

  assert.equal(responseStatus, 200);
  assert.equal(responseBody.user, profileUser);
  assert.deepEqual(responseBody.ratings, [rating]);
  assert.deepEqual(responseBody.recentMatches, []);
  assert.deepEqual(responseBody.upcomingMatches, []);
  assert.deepEqual(responseBody.ratingHistory, [historyEntry]);
  assert.deepEqual(queryCalls.sports[0], { userId: "user-1" });
  assert.equal(queryCalls.matches.length, 2);
  assert.equal(queryCalls.matches[0].players, "user-1");
  assert.deepEqual(queryCalls.matches[0].$or[0], { status: "completed" });
  assert.equal(queryCalls.matches[1].players, "user-1");
  assert.deepEqual(queryCalls.matches[1].$or[0], {
    status: { $in: ["open", "awaiting_result", "awaiting_confirmation"] },
  });
  assert.deepEqual(queryCalls.history[0], { userId: "user-1" });
});
