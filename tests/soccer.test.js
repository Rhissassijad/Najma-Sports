const test = require("node:test");
const assert = require("node:assert/strict");
const { squadElo, lineup, validateTotals } = require("../utils/soccer");
test("soccer Elo handles draws, upsets and capped goal margin", () => {
  assert.deepEqual(squadElo(800, 800, 1, 1), [800, 800]);
  assert.deepEqual(squadElo(800, 800, 1, 0), [816, 784]);
  const upset = squadElo(700, 1000, 1, 0);
  assert(upset[0] - 700 > 16);
  assert.deepEqual(squadElo(800, 800, 6, 0), squadElo(800, 800, 20, 0));
});
test("lineups require accepted distinct members and plausible integer statistics", () => {
  const squad = {
    members: [
      { user: "a", name: "A", status: "accepted" },
      { user: "b", name: "B", status: "invited" },
    ],
  };
  const row = {
    user: "a",
    position: "Forward",
    minutes: 60,
    goals: 1,
    assists: 0,
  };
  assert.equal(lineup([row], squad)[0].name, "A");
  assert.throws(() => lineup([row, row], squad), /distinct/);
  assert.throws(() => lineup([{ ...row, user: "b" }], squad), /accepted/);
  assert.throws(() => lineup([{ ...row, minutes: 0 }], squad), /no minutes/);
  assert.throws(() => lineup([{ ...row, goals: 1.5 }], squad), /whole numbers/);
  assert.throws(() => validateTotals([{ goals: 2, assists: 0 }], 1), /exceed/);
});
