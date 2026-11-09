const catalog = require("../config/sports.json");
const teamSports = Object.keys(catalog.team);
const allSports = [...catalog.individual, ...teamSports];
const normalizeSport = (value) => {
  const text = String(value || "").trim();
  return text.toLowerCase().replace(/[-\s]/g, "") === "volleyball"
    ? "Volleyball"
    : allSports.find((s) => s.toLowerCase() === text.toLowerCase()) || text;
};
const isTeamSport = (name) => teamSports.includes(normalizeSport(name));
const definition = (name) => catalog.team[normalizeSport(name)];
const sportFilter = (sport) =>
  sport === "Soccer"
    ? { $or: [{ sport: "Soccer" }, { sport: { $exists: false } }] }
    : { sport };
module.exports = {
  catalog,
  teamSports,
  allSports,
  normalizeSport,
  isTeamSport,
  definition,
  sportFilter,
};
