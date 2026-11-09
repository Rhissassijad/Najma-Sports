"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { individualDiscipline, performanceValue } from "@/lib/sports";
import { API_URL } from "@/lib/api";
import s from "./RatingPanels.module.css";

export const ratingNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
const changeNumber = (value: number) =>
  `${value > 0 ? "+" : ""}${ratingNumber(value)}`;
const id = (value: any) => String(value?._id || value || "");
const status = (rating: any) =>
  rating.provisional === true
    ? "Provisional"
    : rating.provisional === false
      ? "Established"
      : "Status unavailable";

export function SportPanel({
  user,
  ratings,
  history,
  leaderboards,
  recentMatches,
  picture,
  onEdit,
}: any) {
  const [selected, setSelected] = useState("");
  const rating = ratings.find((r: any) => r._id === selected) || ratings[0];
  const sportId = id(rating?.sportId);
  const d = individualDiscipline(rating?.sportId?.name, rating?.discipline);
  const entries = history
    .filter(
      (h: any) =>
        id(h.sportId) === sportId &&
        (h.discipline || "singles") === (rating?.discipline || "singles"),
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const rows =
    leaderboards[`${sportId}:${rating?.discipline || "singles"}`] ||
    leaderboards[sportId];
  const rank = rows?.find((r: any) => id(r.userId) === id(user))?.rank;
  const points = entries.length
    ? [entries[0].previousRating, ...entries.map((h: any) => h.newRating)]
    : [];
  const min = Math.min(...points) - 10;
  const max = Math.max(...points) + 10;
  const chart = points
    .map(
      (v: number, i: number) =>
        `${24 + (i * 552) / Math.max(1, points.length - 1)},${134 - ((v - min) / (max - min)) * 110}`,
    )
    .join(" ");
  const results = recentMatches.filter(
    (m: any) =>
      id(m.sport) === sportId &&
      (m.discipline || "singles") === (rating?.discipline || "singles"),
  );
  return (
    <>
      <header className={s.identity}>
        {picture ? (
          <img src={picture} alt="" className={s.avatar} />
        ) : (
          <div className={s.avatar}>{(user?.name || "P")[0]}</div>
        )}
        <div>
          <p className={s.eyebrow}>PLAYER PROFILE</p>
          <h1>{user?.name || "Your profile"}</h1>
          <p>My Sports &amp; Levels</p>
        </div>
        <button className={s.edit} onClick={onEdit}>
          Edit profile →
        </button>
      </header>
      <div className={s.tabs} aria-label="Your sports">
        {ratings.map((r: any) => (
          <button
            key={r._id}
            aria-pressed={r._id === rating?._id}
            onClick={() => setSelected(r._id)}
          >
            {r.sportId?.name || "Sport"} ·{" "}
            {individualDiscipline(r.sportId?.name, r.discipline)?.label ||
              "Singles"}
          </button>
        ))}
      </div>
      {rating && d?.mode !== "racket" ? (
        <ProfilePerformance rating={rating} d={d} />
      ) : rating ? (
        <>
          <section
            className={s.hero}
            aria-label={`${rating.sportId?.name} rating`}
          >
            <div>
              <p className={s.eyebrow}>
                {rating.sportId?.name} · {d?.label} · NAJMA RATING
              </p>
              <div className={s.rating}>
                {ratingNumber(rating.currentRating)}
              </div>
              <span className={s.badge}>{status(rating)}</span>
            </div>
            <div className={s.rank}>
              <span>Sport ranking</span>
              <strong>{rank ? `#${rank}` : "—"}</strong>
              <p>
                {rows
                  ? `Among ${rows.length} registered ${rating.sportId?.name || "sport"} ${d?.label || "singles"} players`
                  : "Ranking unavailable"}
              </p>
            </div>
            <div className={s.rank}>
              <span>Confirmed matches</span>
              <strong>{rating.matchesPlayed ?? 0}</strong>
              <p>Results that count toward your rating</p>
            </div>
          </section>
          <div className={s.actions}>
            <Link href="/compete">
              Find an opponent <span>→</span>
            </Link>
            <Link
              href={`/compete?section=leaderboard&sport=${encodeURIComponent(sportId)}&discipline=${encodeURIComponent(rating.discipline || "singles")}`}
            >
              View leaderboard <span>→</span>
            </Link>
          </div>
          <section className={s.card}>
            <div className={s.heading}>
              <h2>Rating progression</h2>
              <span>
                {entries.length
                  ? `${entries.length} rating update${entries.length === 1 ? "" : "s"}`
                  : "Your journey starts here"}
              </span>
            </div>
            {points.length > 1 ? (
              <>
                <svg
                  viewBox="0 0 600 160"
                  className={s.chart}
                  role="img"
                  aria-label={`Rating progression from ${ratingNumber(points[0])} to ${ratingNumber(points[points.length - 1])}`}
                >
                  <path
                    d="M24 134H576 M24 80H576 M24 24H576"
                    stroke="#e2e8f0"
                    fill="none"
                  />
                  <polyline
                    points={chart}
                    fill="none"
                    stroke="#2455df"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {chart.split(" ").map((point: string, i: number) => (
                    <circle
                      key={i}
                      cx={point.split(",")[0]}
                      cy={point.split(",")[1]}
                      r="4"
                      fill="#eebf25"
                    />
                  ))}
                </svg>
                <div className={s.chartLabels}>
                  <span>
                    {new Date(entries[0].createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    {new Date(
                      entries[entries.length - 1].createdAt,
                    ).toLocaleDateString()}
                  </span>
                </div>
                {[...entries]
                  .reverse()
                  .slice(0, 5)
                  .map((entry: any) => (
                    <div className={s.history} key={entry._id}>
                      <span>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                      <strong>
                        {changeNumber(entry.ratingChange)}{" "}
                        <small>→ {ratingNumber(entry.newRating)}</small>
                      </strong>
                    </div>
                  ))}
              </>
            ) : (
              <p className={s.empty}>
                Complete a match and confirm the result with your opponent to
                see your progress.
              </p>
            )}
          </section>
          <section className={s.card}>
            <div className={s.heading}>
              <h2>Recent results</h2>
              <span>Up to 5 most recent profile results</span>
            </div>
            {results.length ? (
              results.map((match: any) => (
                <div className={s.history} key={match._id}>
                  <span>
                    vs{" "}
                    {match.players
                      ?.filter((p: any, i: number) => {
                        const owner = match.players.findIndex(
                          (player: any) => id(player) === id(user),
                        );
                        const sides = match.sideAssignments?.length
                          ? match.sideAssignments
                          : [0, 1];
                        return owner >= 0
                          ? sides[i] !== sides[owner]
                          : id(p) !== id(user);
                      })
                      .map((p: any) => p.name || "Player")
                      .join(", ") || "Opponent"}
                    <small>
                      {new Date(match.createdAt).toLocaleDateString()} ·{" "}
                      {match.status === "completed"
                        ? "Confirmed"
                        : "Result recorded"}
                    </small>
                  </span>
                  <strong>
                    {match.score?.sets
                      ?.map((set: number[]) => set.join("–"))
                      .join(", ") ||
                      match.score?.points?.join("–") ||
                      "Score unavailable"}
                  </strong>
                </div>
              ))
            ) : (
              <p className={s.empty}>No recent results for this sport.</p>
            )}
          </section>
          <details className={s.explanation}>
            <summary>How your Najma rating works</summary>
            <p>
              Every sport starts at 800. Confirmed match results update your
              rating based on your opponent’s level. The rating scale runs from
              0 to 1,500. Ratings remain provisional for the first 10 confirmed
              matches. Rankings cover all registered players in this sport,
              including players with no confirmed matches.
            </p>
          </details>
        </>
      ) : (
        <p className={s.empty}>
          Add your first sport below to start your player journey.
        </p>
      )}
    </>
  );
}

export function LeaderboardPanel({
  rows,
  sports,
  selectedSport,
  onSportChange,
  user,
  loading,
  error,
}: any) {
  const [search, setSearch] = useState("");
  const [player, setPlayer] = useState<any>(null);
  const visible = rows.filter((r: any) =>
    (r.userId?.name || "Player").toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className={s.board}>
      <p className={s.eyebrow}>THE COMPETITION</p>
      <h1>Every point. Every player.</h1>
      <p className={s.subtitle}>
        The{" "}
        {sports.find((sport: any) => sport._id === selectedSport)?.name ||
          "sport"}{" "}
        leaderboard
      </p>
      <div className={s.filters}>
        <label>
          Sport
          <select
            value={selectedSport}
            onChange={(e) => onSportChange(e.target.value)}
          >
            <option value="" disabled>
              Choose a sport
            </option>
            {sports.map((sport: any) => (
              <option key={sport._id} value={sport._id}>
                {sport.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a player
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div>
          <span>Ranking scope</span>
          <strong>All registered players</strong>
        </div>
      </div>
      <div className={s.heading}>
        <h2>Player rankings</h2>
        <span>
          {loading ? "Loading…" : `${rows.length} players · ordered by rating`}
        </span>
      </div>
      {error ? (
        <p role="alert" className={s.empty}>
          {error}
        </p>
      ) : loading ? (
        <p role="status" className={s.empty}>
          Loading rankings…
        </p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Rating</th>
                <th className={s.optional}>Matches</th>
                <th className={s.optional}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r: any) => (
                <tr key={r._id} data-you={id(r.userId) === id(user)}>
                  <td>#{r.rank}</td>
                  <td>
                    <button onClick={() => setPlayer(r)} className={s.player}>
                      <span className={s.miniAvatar}>
                        {(r.userId?.name || "P")[0]}
                      </span>
                      {r.userId?.name || "Player"}
                      {id(r.userId) === id(user) && (
                        <span className={s.you}>You</span>
                      )}
                    </button>
                  </td>
                  <td className={s.numeric}>{ratingNumber(r.currentRating)}</td>
                  <td className={`${s.optional} ${s.numeric}`}>
                    {r.matchesPlayed ?? 0}
                  </td>
                  <td className={s.optional}>
                    <span className={s.status}>{status(r)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className={s.empty}>
              {rows.length
                ? "No players match your search."
                : "No players yet. Add this sport to your profile to join the rankings."}
            </p>
          )}
        </div>
      )}
      <p className={s.footnote}>
        Ratings start at 800. Rankings include players with no confirmed
        matches. Search preserves each player’s overall rank.
      </p>
      {player && (
        <section className={s.card} aria-label="Player summary">
          <div className={s.heading}>
            <h2>{player.userId?.name || "Player"}</h2>
            <button onClick={() => setPlayer(null)}>Close summary ×</button>
          </div>
          <p>
            {ratingNumber(player.currentRating)} rating ·{" "}
            {player.matchesPlayed ?? 0} confirmed matches · {status(player)}
          </p>
          {id(player.userId) === id(user) && (
            <Link href="/profile">View my profile →</Link>
          )}
        </section>
      )}
    </section>
  );
}

function ProfilePerformance({ rating, d }: any) {
  const [bests, setBests] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRows([]);
    setBests([]);
    setError("");
    async function load(path: string) {
      const response = await fetch(
        `${API_URL}/api/individual/${path}?sportId=${rating.sportId._id}&discipline=${encodeURIComponent(d.id)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const body = await response.json();
      if (!response.ok) throw Error(body.message || "Could not load results.");
      return body;
    }
    Promise.all([load("performances"), load("personal-bests")])
      .then(([history, best]) => {
        if (active) {
          setRows(history);
          setBests(best);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [rating._id]);
  return (
    <section className={s.card}>
      <div className={s.heading}>
        <h2>
          {rating.sportId.name} · {d.label}
        </h2>
        <span>Performance records · no Elo</span>
      </div>
      {error && <p role="alert">{error}</p>}
      {d.mode === "time" &&
        ["opponent-confirmed", "self-reported"].map((source) => {
          const values = bests.filter((r) => r.source === source);
          return (
            <div key={source} className={s.history}>
              <span>Best {source} time</span>
              <strong>
                {values.length
                  ? performanceValue(
                      Math.min(...values.map((r) => r.value)),
                      d.mode,
                    )
                  : "No result yet"}
              </strong>
            </div>
          );
        })}
      {rows.slice(0, 5).map((r) => (
        <div className={s.history} key={r._id}>
          <span>
            {new Date(r.recordedAt).toLocaleDateString()} · {r.source}
            {d.mode === "strokes" ? (
              <small>
                {r.context.course} · {r.context.tees} · par {r.context.par}
              </small>
            ) : null}
          </span>
          <strong>{performanceValue(r.value, d.mode)}</strong>
        </div>
      ))}
      {!rows.length && !error && (
        <p className={s.empty}>
          Record your first result to start your performance history.
        </p>
      )}
      <div className={s.actions}>
        <Link
          href={`/compete?section=records&sport=${rating.sportId._id}&discipline=${encodeURIComponent(d.id)}`}
        >
          Record or view results →
        </Link>
        <Link
          href={`/compete?section=leaderboard&sport=${rating.sportId._id}&discipline=${encodeURIComponent(d.id)}`}
        >
          View performance rankings →
        </Link>
      </div>
    </section>
  );
}
