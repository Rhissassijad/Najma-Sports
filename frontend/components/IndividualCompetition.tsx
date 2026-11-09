"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/lib/withAuth";
import { API_URL } from "@/lib/api";
import {
  disciplines,
  individualDiscipline,
  isTeamSport,
  performanceValue,
} from "@/lib/sports";
import { ratingNumber } from "./RatingPanels";
import MatchCard from "./cards/cards";
import s from "./TeamCompetition.module.css";
const fields = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  return Object.fromEntries(new FormData(e.currentTarget));
};
export default function IndividualCompetition() {
  const params = useSearchParams();
  const { isAuthenticated, isCheckingAuth } = useAuthGuard(
    "/auth/login?next=/compete",
  );
  const [sports, setSports] = useState<any[]>([]),
    [sportId, setSportId] = useState(""),
    [discipline, setDiscipline] = useState(""),
    [tab, setTab] = useState(
      params.get("section") === "leaderboard"
        ? "rankings"
        : params.get("section") === "matches"
          ? "matches"
          : params.get("section") === "records"
            ? "records"
            : "find",
    );
  const [me, setMe] = useState<any>(null),
    [matches, setMatches] = useState<any[]>([]),
    [mine, setMine] = useState<any[]>([]),
    [rankings, setRankings] = useState<any[]>([]),
    [performances, setPerformances] = useState<any[]>([]);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [source, setSource] = useState("opponent-confirmed"),
    [course, setCourse] = useState(""),
    [tees, setTees] = useState(""),
    [par, setPar] = useState("");
  const sport = sports.find((s) => s._id === sportId),
    d = individualDiscipline(sport?.name, discipline);
  const context = () => ({ course, tees, par: Number(par) });
  const query = () =>
    new URLSearchParams({
      sportId,
      discipline,
      source,
      ...(d?.mode === "strokes" ? { course, tees, par } : {}),
    }).toString();
  async function api(path: string, body?: any, method = "POST") {
    const r = await fetch(API_URL + "/api" + path, {
      method: body === undefined ? "GET" : method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.message || "Request failed.");
    return result;
  }
  async function refresh() {
    const [user, open, my] = await Promise.all([
      api("/users/me"),
      api("/matches/open"),
      api("/matches/my"),
    ]);
    setMe(user.user);
    setMatches(open);
    setMine(my);
  }
  async function mutate(
    path: string,
    body: any,
    success: string,
    method = "POST",
  ) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(path, body, method);
      await refresh();
      if (d?.mode !== "racket" && sportId)
        setPerformances(await api("/individual/performances?" + query()));
      setMessage(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    (async () => {
      try {
        const catalog = (await api("/sports")).filter(
          (s: any) => !isTeamSport(s.name),
        );
        if (!active) return;
        setSports(catalog);
        const selected =
          catalog.find(
            (s: any) =>
              s._id === params.get("sport") || s.name === params.get("sport"),
          ) || catalog[0];
        setSportId(selected?._id || "");
        const ds = disciplines(selected?.name);
        setDiscipline(
          ds.find((d) => d.id === params.get("discipline"))?.id ||
            ds[0]?.id ||
            "",
        );
        await refresh();
        if (!active) return;
        setTab(
          params.get("section") === "leaderboard"
            ? "rankings"
            : params.get("section") === "matches"
              ? "matches"
              : params.get("section") === "records"
                ? "records"
                : "find",
        );
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, params.toString()]);
  useEffect(() => {
    if (!sportId || !d) return;
    let active = true;
    setRankings([]);
    setPerformances([]);
    (async () => {
      try {
        if (d.mode === "racket") {
          const rows = await api(
            `/leaderboard/${sportId}?discipline=${discipline}`,
          );
          if (active) setRankings(rows);
        } else {
          const rows = await api("/individual/performances?" + query());
          if (active) setPerformances(rows);
          if (
            d.mode === "strokes" &&
            (!course.trim() ||
              !tees.trim() ||
              !par ||
              !Number.isInteger(Number(par)) ||
              Number(par) < d.holes! * 2 ||
              Number(par) > d.holes! * 6)
          )
            return;
          const board = await api("/individual/leaderboard?" + query());
          if (active) setRankings(board);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [sportId, discipline, source, course, tees, par, message]);
  if (isCheckingAuth || !isAuthenticated) return null;
  const visible = (rows: any[]) =>
    rows.filter(
      (m) =>
        m.sport?._id === sportId && (m.discipline || "singles") === discipline,
    );
  const scoreText = (m: any) => {
    const value = m.proposedScore || m.score;
    if (!value) return "";
    return value.values
      ? value.values.map((v: number) => performanceValue(v, d.mode)).join(" / ")
      : value.points?.join(" – ") ||
          value.sets?.map((v: number[]) => v.join("–")).join(", ");
  };
  function resultBody(e: FormEvent<HTMLFormElement>) {
    const f = fields(e);
    if (d.mode !== "racket")
      return { type: d.mode, values: [Number(f.one), Number(f.two)] };
    if (f.format === "sets")
      return {
        type: "sets",
        sets: String(f.sets)
          .split(",")
          .map((s) => s.trim().split("-").map(Number)),
      };
    return { type: "standard", points: [Number(f.one), Number(f.two)] };
  }
  function matchList(rows: any[]) {
    return visible(rows).map((m) => {
      const joined = m.players.some((p: any) => p._id === me?._id),
        assign = m.sideAssignments?.length ? m.sideAssignments : [0, 1],
        counts = [0, 1].map(
          (side) => assign.filter((v: number) => v === side).length,
        ),
        confirmed =
          (m.confirmations || []).includes(me?._id) ||
          m.resultReporter?._id === me?._id;
      return (
        <article className={s.match} key={m._id}>
          <MatchCard match={m} sport={sport?.name} />
          {d.mode === "strokes" && (
            <p className={s.muted}>
              {m.context?.course} · {m.context?.tees} · par {m.context?.par}
            </p>
          )}
          {m.status === "open" && !joined && (
            <div className={s.actions}>
              {[0, 1]
                .filter((side) => counts[side] < d.sideSize)
                .map((side) => (
                  <button
                    key={side}
                    disabled={busy}
                    onClick={() =>
                      mutate(
                        `/matches/${m._id}/join`,
                        { side },
                        "Joined the match.",
                      )
                    }
                  >
                    Join side {side + 1} · {counts[side]}/{d.sideSize}
                  </button>
                ))}
            </div>
          )}
          {m.status === "open" && joined && (
            <p className={s.muted}>
              Waiting for {d.sideSize * 2 - m.players.length} more
              participant(s). All participants join for themselves.
            </p>
          )}
          {joined && m.status === "awaiting_result" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const score = resultBody(e);
                if (
                  score.type !== "sets" &&
                  Array.from(new FormData(e.currentTarget).entries())
                    .filter(([k]) => ["one", "two"].includes(k))
                    .some(([, v]) => !String(v).trim())
                ) {
                  setError("Enter a result for both sides.");
                  return;
                }
                void mutate(
                  `/matches/${m._id}/result`,
                  { score },
                  "Result submitted. Every other participant must confirm.",
                );
              }}
            >
              <p className={s.muted}>
                Scores follow side 1 / side 2.{" "}
                {d.mode === "time"
                  ? "Enter times in seconds, including decimals."
                  : d.mode === "strokes"
                    ? "Enter gross stroke totals; lower wins."
                    : "Use points/games or comma-separated set scores. Rules vary by event; enter the final decided score."}
              </p>
              {d.mode === "racket" && (
                <label>
                  Score format
                  <select name="format">
                    <option value="standard">Points / games won</option>
                    <option value="sets">
                      Sets / games (e.g. 21-18, 21-16)
                    </option>
                  </select>
                </label>
              )}
              <div className={s.formRow}>
                {["one", "two"].map((key, i) => (
                  <label key={key}>
                    Side {i + 1}{" "}
                    {d.mode === "time"
                      ? "seconds"
                      : d.mode === "strokes"
                        ? "strokes"
                        : "points/games"}
                    <input
                      name={key}
                      type="number"
                      min={
                        d.mode === "racket"
                          ? 0
                          : d.mode === "time"
                            ? 0.001
                            : d.holes
                      }
                      step={d.mode === "time" ? 0.001 : 1}
                    />
                  </label>
                ))}
              </div>
              {d.mode === "racket" && (
                <label>
                  Set/game scores
                  <input name="sets" placeholder="21-18, 21-16" />
                </label>
              )}
              <button disabled={busy}>Submit result</button>
            </form>
          )}
          {joined && m.status === "awaiting_confirmation" && (
            <>
              <p className={s.muted}>
                Proposed: {scoreText(m)} · {(m.confirmations || []).length}/
                {m.players.length} confirmations.
              </p>
              {!confirmed ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      `/matches/${m._id}/confirm-result`,
                      {},
                      "Confirmation saved. Ratings/results update only once everyone confirms.",
                    )
                  }
                >
                  Confirm result
                </button>
              ) : (
                <p className={s.muted}>
                  Waiting for remaining participants to confirm.
                </p>
              )}
            </>
          )}
        </article>
      );
    });
  }
  return (
    <main className={s.page}>
      <header className={s.hero}>
        <div>
          <p className={s.eyebrow}>INDIVIDUAL COMPETITION</p>
          <h1>Your event. Your next level.</h1>
          <p>
            Singles, doubles, swimming events and golf rounds. Every discipline
            stands on its own.
          </p>
        </div>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={s.message}>
          {message}
        </p>
      )}
      <section className={s.card} style={{ marginTop: 22 }}>
        <div className={s.formRow}>
          <label>
            Sport
            <select
              value={sportId}
              onChange={(e) => {
                setSportId(e.target.value);
                setDiscipline(
                  disciplines(
                    sports.find((s) => s._id === e.target.value)?.name,
                  )[0]?.id || "",
                );
                setError("");
                setMessage("");
              }}
            >
              {sports.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Discipline / event
            <select
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setError("");
                setMessage("");
              }}
            >
              {disciplines(sport?.name).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {d?.mode === "strokes" && (
          <>
            <p className={s.muted}>
              Golf rankings compare gross strokes only on the same course, tees,
              par and number of holes. This is not a handicap index.
            </p>
            <div className={s.formRow}>
              <label>
                Course
                <input
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Tees
                <input
                  value={tees}
                  onChange={(e) => setTees(e.target.value)}
                  maxLength={60}
                />
              </label>
              <label>
                Total course par
                <input
                  type="number"
                  value={par}
                  onChange={(e) => setPar(e.target.value)}
                  min={d.holes! * 2}
                  max={d.holes! * 6}
                />
              </label>
            </div>
          </>
        )}
        <p className={s.muted}>
          {d?.mode === "racket"
            ? "Ratings start at 800 separately for each discipline. Doubles compares side-average ratings and updates each participant’s doubles rating."
            : d?.mode === "time"
              ? "Times are ranked lowest first, separately by stroke, distance and pool length. Self-reported times and opponent-confirmed times are separate; neither is an official certified result."
              : "Use personal round records or an opponent-confirmed head-to-head round. Lower gross strokes rank first."}
        </p>
      </section>
      <div className={s.tabs}>
        {[
          ["find", "Find matches"],
          ["matches", "My matches"],
          ["rankings", "Rankings"],
          ...(d?.mode !== "racket" ? [["records", "My results"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <Link href="/profile">My sports & levels →</Link>
      </div>
      {loading ? (
        <p role="status">Loading individual competition…</p>
      ) : !d ? (
        <p>Choose a sport.</p>
      ) : (
        <>
          {tab === "find" && (
            <>
              <section className={s.card}>
                <h2>
                  Create a{" "}
                  {d.sideSize === 2 ? "doubles match" : "head-to-head event"}
                </h2>
                <p className={s.muted}>
                  {d.label} · {d.sideSize * 2} participants.{" "}
                  {d.mode !== "racket"
                    ? "You can also record a solo result in My results."
                    : ""}
                </p>
                <form
                  onSubmit={async (e) => {
                    const f = fields(e);
                    await mutate(
                      "/matches",
                      {
                        sport: sportId,
                        discipline,
                        context: context(),
                        venue: f.venue,
                        scheduledAt: f.date
                          ? new Date(String(f.date)).toISOString()
                          : undefined,
                      },
                      "Match created. Other participants can now join.",
                    );
                  }}
                >
                  <label>
                    Venue
                    <input name="venue" maxLength={120} />
                  </label>
                  <label>
                    Scheduled date (optional)
                    <input name="date" type="datetime-local" />
                  </label>
                  <button disabled={busy}>Create open match</button>
                </form>
              </section>
              <section className={s.card}>
                <h2>Available matches</h2>
                {matchList(matches)}
                {!visible(matches).length && (
                  <p className={s.empty}>
                    No open matches for this discipline. Create the first one.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "matches" && (
            <section className={s.card}>
              <h2>My match history</h2>
              {matchList(mine)}
              {!visible(mine).length && (
                <p className={s.empty}>No matches for this discipline yet.</p>
              )}
            </section>
          )}
          {tab === "rankings" && (
            <section className={s.card}>
              <h2>
                {sport?.name} · {d.label}
              </h2>
              {d.mode !== "racket" && (
                <label>
                  Result source
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="opponent-confirmed">
                      Opponent-confirmed
                    </option>
                    <option value="self-reported">Self-reported</option>
                  </select>
                </label>
              )}
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>
                        {d.mode === "racket"
                          ? "Rating"
                          : d.mode === "time"
                            ? "Best time"
                            : "Best gross strokes"}
                      </th>
                      <th>{d.mode === "racket" ? "Matches" : "Source"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r: any) => (
                      <tr key={r._id}>
                        <td>#{r.rank}</td>
                        <td>
                          {r.userId?.name || "Player"}
                          {r.userId?._id === me?._id ? " · You" : ""}
                        </td>
                        <td>
                          {d.mode === "racket"
                            ? ratingNumber(r.currentRating)
                            : performanceValue(r.value, d.mode)}
                        </td>
                        <td>
                          {d.mode === "racket" ? r.matchesPlayed : r.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rankings.length && (
                <p className={s.empty}>
                  No results in this comparison yet.
                  {d.mode === "strokes"
                    ? " Enter course, tees and par above."
                    : ""}
                </p>
              )}
            </section>
          )}
          {tab === "records" && d.mode !== "racket" && (
            <section className={s.card}>
              <h2>My {d.mode === "time" ? "times" : "rounds"}</h2>
              <form
                onSubmit={async (e) => {
                  const f = fields(e);
                  await mutate(
                    "/individual/performances",
                    {
                      sportId,
                      discipline,
                      value: Number(f.value),
                      recordedAt: new Date(
                        String(f.date) + "T00:00:00",
                      ).toISOString(),
                      context: context(),
                    },
                    "Self-reported result recorded.",
                  );
                }}
              >
                <div className={s.formRow}>
                  <label>
                    {d.mode === "time" ? "Time in seconds" : "Gross strokes"}
                    <input
                      name="value"
                      type="number"
                      required
                      min={d.mode === "time" ? 0.001 : d.holes}
                      step={d.mode === "time" ? 0.001 : 1}
                    />
                  </label>
                  <label>
                    Result date
                    <input name="date" type="date" required />
                  </label>
                </div>
                <button disabled={busy}>Record self-reported result</button>
              </form>
              {performances.map((r) => (
                <div className={s.row} key={r._id}>
                  <span>
                    {performanceValue(r.value, d.mode)}
                    <small>
                      {new Date(r.recordedAt).toLocaleDateString()} · {r.source}
                      {d.mode === "strokes"
                        ? ` · ${r.context.course} · ${r.context.tees} · par ${r.context.par}`
                        : ""}
                    </small>
                  </span>
                  {r.source === "self-reported" && (
                    <button
                      disabled={busy}
                      className={s.secondary}
                      onClick={() =>
                        mutate(
                          "/individual/performances/" + r._id,
                          {},
                          "Result removed.",
                          "DELETE",
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
