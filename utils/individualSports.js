const { catalog, normalizeSport } = require("./sports");
const list = (sport) => catalog.disciplines[normalizeSport(sport)] || [];
const discipline = (sport, id) =>
  list(sport).find((d) => d.id === (id || list(sport)[0]?.id));
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
function resolve(sport, id) {
  const d = discipline(sport, id);
  if (!d) fail("Choose a valid discipline for this sport.");
  return d;
}
function context(d, body = {}) {
  if (d.mode !== "strokes") return {};
  const course = String(body.course || "")
      .trim()
      .replace(/\s+/g, " "),
    tees = String(body.tees || "")
      .trim()
      .replace(/\s+/g, " "),
    par = Number(body.par);
  if (
    !course ||
    course.length > 120 ||
    !tees ||
    tees.length > 60 ||
    !Number.isInteger(par) ||
    par < d.holes * 2 ||
    par > d.holes * 6
  )
    fail(
      "Golf needs a course, tees and valid total par for the selected holes.",
    );
  return {
    course,
    tees,
    par,
    courseKey: course.toLowerCase(),
    teesKey: tees.toLowerCase(),
  };
}
function result(d, input) {
  if (!input || typeof input !== "object") fail("Enter a result.");
  if (d.mode === "time" || d.mode === "strokes") {
    const values = input.values;
    if (
      !Array.isArray(values) ||
      values.length !== 2 ||
      values.some(
        (v) =>
          !Number.isFinite(v) ||
          v < (d.mode === "time" ? 0.001 : d.holes) ||
          v > (d.mode === "time" ? 86400 : d.holes * 30) ||
          (d.mode === "strokes" && !Number.isInteger(v)),
      )
    )
      fail(
        d.mode === "time"
          ? "Enter two positive times in seconds (up to 24 hours)."
          : "Enter two positive whole-number stroke totals.",
      );
    const canonical = values.map((v) =>
      d.mode === "time" ? Math.round(v * 1000) / 1000 : v,
    );
    return {
      score: { type: d.mode, values: canonical },
      winner:
        canonical[0] === canonical[1]
          ? null
          : canonical[0] < canonical[1]
            ? 0
            : 1,
    };
  }
  const score = input;
  if (score.type === "standard") {
    if (
      !Array.isArray(score.points) ||
      score.points.length !== 2 ||
      score.points.some((n) => !Number.isInteger(n) || n < 0 || n > 1000) ||
      score.points[0] === score.points[1]
    )
      fail("Enter two different non-negative whole-number scores.");
    return {
      score: { type: "standard", points: score.points },
      winner: score.points[0] > score.points[1] ? 0 : 1,
    };
  }
  if (score.type === "sets") {
    if (
      !Array.isArray(score.sets) ||
      !score.sets.length ||
      score.sets.length > 7 ||
      score.sets.some(
        (s) =>
          !Array.isArray(s) ||
          s.length !== 2 ||
          s.some((n) => !Number.isInteger(n) || n < 0 || n > 1000) ||
          s[0] === s[1],
      )
    )
      fail("Enter decided set/game scores, such as 21-18, 21-16.");
    const wins = score.sets.reduce((n, s) => n + (s[0] > s[1] ? 1 : -1), 0);
    if (!wins) fail("The match must have a winner.");
    return {
      score: { type: "sets", sets: score.sets },
      winner: wins > 0 ? 0 : 1,
    };
  }
  fail("Choose a supported score format.");
}
const scope = (key) => ({
  $or: [
    { discipline: key },
    ...(key === "singles" ? [{ discipline: { $exists: false } }] : []),
  ],
});
const optionalDiscipline = (sport, id) => (id ? resolve(sport, id).id : "");
module.exports = {
  optionalDiscipline,
  list,
  resolve,
  context,
  result,
  scope,
  fail,
};
