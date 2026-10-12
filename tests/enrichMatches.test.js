const test = require("node:test");
const assert = require("node:assert/strict");
const UserSport = require("../models/userSport");
const RatingHistory = require("../models/RatingHistory");
const enrichMatches = require("../utils/enrichMatches");

test("adds sport-specific current ratings and match rating changes", async (t) => {
  const originalUserSportFind = UserSport.find;
  const originalRatingHistoryFind = RatingHistory.find;

  t.after(() => {
    UserSport.find = originalUserSportFind;
    RatingHistory.find = originalRatingHistoryFind;
  });

  UserSport.find = async () => [
    { userId: "player-one", sportId: "sport-one", currentRating: 810 },
    { userId: "player-two", sportId: "sport-one", currentRating: 790 },
  ];
  RatingHistory.find = async () => [
    { userId: "player-one", matchId: "match-one", ratingChange: 10 },
    { userId: "player-two", matchId: "match-one", ratingChange: -10 },
  ];

  const players = [
    {
      _id: "player-one",
      name: "Player One",
      toObject() {
        return { _id: this._id, name: this.name };
      },
    },
    {
      _id: "player-two",
      name: "Player Two",
      toObject() {
        return { _id: this._id, name: this.name };
      },
    },
  ];
  const match = {
    _id: "match-one",
    sport: { _id: "sport-one", name: "Tennis" },
    players,
    toObject() {
      return { _id: this._id, sport: this.sport, players: this.players };
    },
  };

  const [result] = await enrichMatches([match]);
  assert.deepEqual(
    result.players.map(({ rating, ratingChange }) => ({ rating, ratingChange })),
    [
      { rating: 810, ratingChange: 10 },
      { rating: 790, ratingChange: -10 },
    ]
  );
});
