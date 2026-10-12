const test = require("node:test");
const assert = require("node:assert/strict");
const calculateWinner = require("../utils/calculateWinner");

const players = ["player-one", "player-two"];

test("determines the winner from standard scores", () => {
  assert.equal(
    calculateWinner({ type: "standard", points: [3, 1] }, players),
    0
  );
  assert.equal(
    calculateWinner({ type: "standard", points: [0, 4] }, players),
    1
  );
});

test("determines the winner from set scores", () => {
  assert.equal(
    calculateWinner(
      { type: "sets", sets: [[6, 4], [3, 6], [6, 2]] },
      players
    ),
    0
  );
});

test("rejects tied or malformed scores", () => {
  assert.equal(
    calculateWinner({ type: "standard", points: [2, 2] }, players),
    null
  );
  assert.equal(
    calculateWinner({ type: "standard", points: [2, "1"] }, players),
    null
  );
  assert.equal(
    calculateWinner({ type: "sets", sets: [[6, 6]] }, players),
    null
  );
  assert.equal(
    calculateWinner({ type: "standard", points: [1, 0] }, [players[0]]),
    null
  );
});
