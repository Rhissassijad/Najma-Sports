const { definition } = require("./sports");
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function text(value, label, max = 80) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(`${label} must be 1–${max} characters.`);
  return value.trim();
}
function integer(value, max, label) {
  if (!Number.isInteger(value) || value < 0 || value > max)
    fail(`${label} must be whole numbers between 0 and ${max}.`);
  return value;
}
function score(value, sport = "Soccer") {
  return integer(value, definition(sport).maxScore, "Scores");
}
function lineup(rows, squad) {
  const sport = squad.sport || "Soccer",
    d = definition(sport),
    seen = new Set();
  if (!Array.isArray(rows) || rows.length > 50)
    fail("A lineup may contain at most 50 players.");
  return rows.map((row) => {
    const member = squad.members.find(
      (m) => same(m.user, row.user) && m.status === "accepted",
    );
    if (!member || seen.has(String(row.user)))
      fail("Lineups must contain distinct, accepted roster members.");
    seen.add(String(row.user));
    if (!d.positions.includes(row.position))
      fail("Choose a valid playing position for this sport.");
    const supplied = row.stats || {};
    const keys = [d.participation.key, ...d.metrics.map((m) => m.key)];
    if (Object.keys(supplied).some((k) => !keys.includes(k)))
      fail("Statistics do not belong to this sport.");
    const stats = {};
    for (const m of [d.participation, ...d.metrics])
      stats[m.key] = integer(
        supplied[m.key] ?? row[m.key] ?? 0,
        m.max,
        m.label,
      );
    if (stats[d.participation.key] === 0 && d.metrics.some((m) => stats[m.key]))
      fail("A player with no minutes or participation cannot have statistics.");
    return {
      user: member.user,
      name: member.name,
      position: row.position,
      minutes: stats.minutes || 0,
      goals: sport === "Soccer" ? stats.goals : 0,
      assists: sport === "Soccer" ? stats.assists : 0,
      stats,
    };
  });
}
const stat = (row, key) =>
  row.stats?.get
    ? (row.stats.get(key) ?? row[key] ?? 0)
    : (row.stats?.[key] ?? row[key] ?? 0);
function validateTotals(rows, total, sport = "Soccer") {
  const rules =
    {
      Soccer: { goals: 1, assists: 1 },
      Handball: { goals: 1, assists: 1 },
      Hockey: { goals: 1, assists: 2 },
      Basketball: { points: 1 },
      Baseball: { runs: 1, rbi: 1 },
      Football: { touchdowns: 1 / 6 },
    }[sport] || {};
  for (const [key, factor] of Object.entries(rules))
    if (rows.reduce((n, r) => n + stat(r, key), 0) > total * factor)
      fail("Recorded player statistics cannot exceed the squad score.");
}
function validateResult(home, away, sport = "Soccer") {
  const d = definition(sport);
  score(home, sport);
  score(away, sport);
  if (!d.allowDraw && home === away)
    fail(
      "This sport requires a decided result. Include overtime or extra innings.",
    );
  if (
    sport === "Volleyball" &&
    !(
      (Math.max(home, away) === 3 && Math.min(home, away) < 3) ||
      (Math.max(home, away) === 2 && Math.min(home, away) < 2)
    )
  )
    fail(
      "Volleyball results must be decided best-of-three or best-of-five sets.",
    );
}
function squadElo(home, away, hs, as, sport = "Soccer") {
  const actual = hs === as ? 0.5 : hs > as ? 1 : 0,
    expected = 1 / (1 + 10 ** ((away - home) / 400));
  const margin =
    1 +
    Math.min(
      Math.max(Math.abs(hs - as) - 1, 0) * definition(sport).marginStep,
      0.25,
    );
  const delta = 32 * margin * (actual - expected);
  return [home + delta, away - delta].map((n) =>
    Number(Math.max(0, Math.min(1500, n)).toFixed(2)),
  );
}
module.exports = {
  same,
  fail,
  text,
  score,
  lineup,
  stat,
  validateTotals,
  validateResult,
  squadElo,
  positions: definition("Soccer").positions,
};
