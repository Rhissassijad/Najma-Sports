const test = require("node:test");
const assert = require("node:assert/strict");
const {
  catalog,
  teamSports,
  allSports,
  normalizeSport,
} = require("../utils/sports");
const {
  lineup,
  validateResult,
  validateTotals,
  squadElo,
} = require("../utils/teamSports");
test("shared catalog includes every proposed sport and normalizes volleyball", () => {
  assert.equal(teamSports.length, 7);
  assert.equal(allSports.length, 10);
  assert.equal(normalizeSport("Volley-Ball"), "Volleyball");
});
for (const sport of teamSports)
  test(sport + " uses its own positions, participation and scoring", () => {
    const d = catalog.team[sport];
    const squad = {
      sport,
      members: [{ user: "p", name: "Player", status: "accepted" }],
    };
    const stats = { [d.participation.key]: 1, [d.metrics[0].key]: 1 };
    assert.equal(
      lineup([{ user: "p", position: d.positions[0], stats }], squad)[0].stats[
        d.metrics[0].key
      ],
      1,
    );
    assert.throws(
      () =>
        lineup(
          [
            {
              user: "p",
              position: d.positions[0],
              stats: { ...stats, invented: 1 },
            },
          ],
          squad,
        ),
      /do not belong/,
    );
    if (!d.allowDraw)
      assert.throws(() => validateResult(1, 1, sport), /decided/);
    assert.throws(() => validateResult(-1, 1, sport), /whole/);
    const winner = squadElo(800, 800, 3, 0, sport);
    assert(winner[0] > 800 && winner[1] < 800);
  });
test("volleyball scores are sets and hockey can record two assists per goal", () => {
  assert.throws(() => validateResult(1, 0, "Volleyball"), /sets/);
  validateResult(3, 2, "Volleyball");
  validateTotals([{ stats: { goals: 1, assists: 2 } }], 1, "Hockey");
  assert.throws(
    () => validateTotals([{ stats: { points: 5 } }], 2, "Basketball"),
    /exceed/,
  );
});
