const test = require("node:test"),
  assert = require("node:assert/strict");
const { catalog } = require("../utils/sports");
const { list, resolve, result, context } = require("../utils/individualSports");
test("individual catalog supports all seven sports, doubles and mixed doubles", () => {
  assert.equal(catalog.individual.length, 7);
  for (const sport of catalog.individual.slice(0, 5)) {
    assert.equal(resolve(sport, "doubles").sideSize, 2);
    assert.equal(resolve(sport, "mixed-doubles").sideSize, 2);
  }
  assert.throws(() => resolve("Soccer", "singles"), /valid discipline/);
});
test("swimming separates stroke, distance and pool length and ranks lower times first", () => {
  const short = resolve("Swimming", "50m-freestyle-25m"),
    long = resolve("Swimming", "50m-freestyle-50m");
  assert.notEqual(short.id, long.id);
  assert(list("Swimming").some((d) => d.id === "400m-individual-medley-50m"));
  assert.equal(result(short, { values: [24.5, 25.1] }).winner, 0);
  assert.equal(result(short, { values: [24.5001, 24.5002] }).winner, null);
  assert.throws(() => result(short, { values: [0, 25] }), /positive/);
});
test("golf distinguishes round lengths, requires comparison context and lower gross strokes win", () => {
  const d = resolve("Golf", "stroke-18");
  assert.equal(result(d, { values: [72, 75] }).winner, 0);
  assert.throws(() => result(d, { values: [72.2, 75] }), /whole-number/);
  assert.throws(
    () => context(d, { course: "", tees: "Blue", par: 72 }),
    /course/,
  );
  const c = context(d, {
    course: "  Riverside  City ",
    tees: " BLUE ",
    par: 72,
  });
  assert.equal(c.courseKey, "riverside city");
  assert.equal(c.teesKey, "blue");
  assert.throws(
    () =>
      context(resolve("Golf", "stroke-9"), {
        course: "City",
        tees: "Blue",
        par: 72,
      }),
    /par/,
  );
});
test("racket scores reject ties, incomplete sets and decimal points", () => {
  const d = resolve("Badminton", "doubles");
  assert.equal(
    result(d, {
      type: "sets",
      sets: [
        [21, 18],
        [21, 16],
      ],
    }).winner,
    0,
  );
  assert.throws(
    () =>
      result(d, {
        type: "sets",
        sets: [
          [21, 18],
          [18, 21],
        ],
      }),
    /winner/,
  );
  assert.throws(
    () => result(d, { type: "standard", points: [21.5, 18] }),
    /whole-number/,
  );
});
