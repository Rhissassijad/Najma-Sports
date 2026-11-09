import catalog from "../../config/sports.json";
export const TEAM_SPORTS = Object.keys(catalog.team);
export const INDIVIDUAL_SPORTS = catalog.individual;
export const ALL_SPORTS = [...INDIVIDUAL_SPORTS, ...TEAM_SPORTS];
export const isTeamSport = (sport: string) =>
  TEAM_SPORTS.some(
    (name) =>
      name.toLowerCase().replace(/[-\s]/g, "") ===
      String(sport || "")
        .toLowerCase()
        .replace(/[-\s]/g, ""),
  );
export type TeamSportDefinition = {
  formats: string[];
  positions: string[];
  metrics: { key: string; label: string; max: number }[];
  scoreLabel: string;
  allowDraw: boolean;
  participation: { key: string; label: string; max: number };
  maxScore: number;
  marginStep: number;
  sideLabel: string;
};
export const teamDefinition = (sport: string) =>
  (catalog.team as Record<string, TeamSportDefinition>)[sport] ||
  catalog.team.Soccer;
export const formatLabel = (sport: string, format: string) =>
  sport === "Volleyball" && format === "2"
    ? "Beach doubles"
    : `${format}-a-side`;
