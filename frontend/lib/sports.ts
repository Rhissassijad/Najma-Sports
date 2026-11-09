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

export type IndividualDiscipline = {
  id: string;
  label: string;
  mode: string;
  sideSize: number;
  poolLength?: number;
  distance?: number;
  stroke?: string;
  holes?: number;
};
export const disciplines = (sport: string): IndividualDiscipline[] =>
  (catalog.disciplines as Record<string, IndividualDiscipline[]>)[sport] || [];
export const individualDiscipline = (sport: string, id?: string) =>
  disciplines(sport).find((d) => d.id === (id || disciplines(sport)[0]?.id)) ||
  disciplines(sport)[0];
export const performanceValue = (value: number, mode: string) =>
  mode === "time"
    ? `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, "0")}`
    : `${value} strokes`;
