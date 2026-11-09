const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function text(value, label, max = 80) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(`${label} must be 1–${max} characters.`);
  return value.trim();
}
function score(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100)
    fail("Scores must be whole numbers between 0 and 100.");
  return value;
}
function lineup(rows, squad) {
  if (!Array.isArray(rows) || rows.length > 30)
    fail("A lineup may contain at most 30 players.");
  const seen = new Set();
  return rows.map((row) => {
    const member = squad.members.find(
      (m) => same(m.user, row.user) && m.status === "accepted",
    );
    if (!member || seen.has(String(row.user)))
      fail("Lineups must contain distinct, accepted roster members.");
    seen.add(String(row.user));
    if (!positions.includes(row.position))
      fail("Choose a valid playing position.");
    if (!Number.isInteger(row.minutes) || row.minutes < 0 || row.minutes > 120)
      fail("Minutes must be a whole number between 0 and 120.");
    const goals = score(row.goals ?? 0),
      assists = score(row.assists ?? 0);
    if (row.minutes === 0 && (goals || assists))
      fail("A player with no minutes cannot have goals or assists.");
    return {
      user: member.user,
      name: member.name,
      position: row.position,
      minutes: row.minutes,
      goals,
      assists,
    };
  });
}
function validateTotals(rows, goals) {
  if (
    rows.reduce((sum, r) => sum + r.goals, 0) > goals ||
    rows.reduce((sum, r) => sum + r.assists, 0) > goals
  )
    fail("Recorded player goals and assists cannot exceed the squad score.");
}
function squadElo(home, away, homeScore, awayScore) {
  const actual = homeScore === awayScore ? 0.5 : homeScore > awayScore ? 1 : 0;
  const expected = 1 / (1 + 10 ** ((away - home) / 400));
  // Result is primary; the goal-margin multiplier is capped at 1.25.
  const margin =
    1 + Math.min(Math.max(Math.abs(homeScore - awayScore) - 1, 0), 5) * 0.05;
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
  validateTotals,
  squadElo,
  positions,
};
