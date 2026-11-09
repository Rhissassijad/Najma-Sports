"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuthGuard } from "@/lib/withAuth";
import { API_URL } from "@/lib/api";
import { ratingNumber } from "@/components/RatingPanels";
import s from "./page.module.css";

type Member = { user: string; name: string; status: string };
type Squad = {
  _id: string;
  name: string;
  club?: string;
  manager: string;
  format: string;
  members: Member[];
  rating: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};
const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
const fields = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
};
const states: Record<string, string> = {
  challenge: "Challenge · awaiting opponent",
  scheduled: "Scheduled",
  awaiting_confirmation: "Awaiting opponent confirmation",
  disputed: "Disputed · managers must resolve",
  completed: "Confirmed",
  declined: "Challenge declined",
};
export default function SoccerPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard(
    "/auth/login?next=/soccer",
  );
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("squads");
  const [format, setFormat] = useState("11");
  const [selected, setSelected] = useState("");
  const [player, setPlayer] = useState<any>(null);
  const [profileFormat, setProfileFormat] = useState("11");
  async function api(path = "", body?: any, method = "POST") {
    const response = await fetch(`${API_URL}/api/soccer${path}`, {
      method: body === undefined ? "GET" : method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Unable to complete the request.");
    return result;
  }
  async function refresh() {
    const result = await api();
    setData(result);
    return result;
  }
  async function viewPlayer(id: string) {
    setError("");
    try {
      setPlayer(await api(`/players/${id}`));
      setTab("player");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (isAuthenticated) refresh().catch((e) => setError(e.message));
  }, [isAuthenticated]);
  async function act(
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
      setMessage(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (isCheckingAuth || !isAuthenticated) return null;
  const squads: Squad[] = data?.squads || [];
  const mine = squads.filter((q) => q.manager === data?.userId);
  const squad = squads.find((q) => q._id === selected);
  const name = (id: string) =>
    squads.find((q) => q._id === id)?.name || "Squad";
  const memberships = squads.flatMap((q) =>
    q.members
      .filter(
        (m) =>
          (m.user === data?.userId && m.status === "invited") ||
          (q.manager === data?.userId && m.status === "requested"),
      )
      .map((m) => ({ squad: q, member: m })),
  );
  const appearances = (player?.appearances || []).filter(
    (r: any) => r.format === profileFormat,
  );
  return (
    <main className={s.page}>
      <header className={s.hero}>
        <div>
          <p className={s.eyebrow}>THE BEAUTIFUL GAME</p>
          <h1>One squad. Every player.</h1>
          <p>Compete as a team. Build your own player journey.</p>
        </div>
        <span className={s.heroBadge}>SOCCER · 5 / 7 / 11-A-SIDE</span>
      </header>
      <div className={s.tabs} aria-label="Soccer sections">
        {[
          ["squads", "Squads & clubs"],
          ["matches", "Matches"],
          ["player", "Player profile"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "player" && data) void viewPlayer(data.userId);
            }}
          >
            {label}
          </button>
        ))}
        <button
          className={s.refresh}
          disabled={busy}
          onClick={async () => {
            setError("");
            try {
              await refresh();
              setMessage("Soccer data refreshed.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Refresh
        </button>
        <Link href="/compete">Individual sports →</Link>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}{" "}
          <button onClick={() => refresh().catch((e) => setError(e.message))}>
            Refresh
          </button>
        </p>
      )}
      {message && (
        <p className={s.message} role="status">
          {message}
        </p>
      )}
      {!data ? (
        <p role="status">Loading soccer…</p>
      ) : (
        <>
          {memberships.length > 0 && (
            <section className={s.card}>
              <h2>Membership inbox</h2>
              <p className={s.muted}>
                Joining requires acceptance. Pending players are not on the
                roster.
              </p>
              {memberships.map(({ squad: q, member: m }) => (
                <div className={s.row} key={q._id + m.user}>
                  <span>
                    <strong>{m.name}</strong> · {q.name}
                    <small>
                      {m.status === "invited"
                        ? "You have been invited"
                        : "Wants to join your squad"}
                    </small>
                  </span>
                  <div className={s.actions}>
                    {["accept", "decline"].map((action) => (
                      <button
                        key={action}
                        disabled={busy}
                        onClick={() =>
                          act(
                            `/squads/${q._id}/membership`,
                            { action, playerId: m.user },
                            `Membership ${action === "accept" ? "accepted" : "declined"}.`,
                          )
                        }
                      >
                        {action === "accept" ? "Accept" : "Decline"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
          {tab === "squads" && (
            <>
              <div className={s.columns}>
                <section className={s.card}>
                  <h2>Your club</h2>
                  <p className={s.muted}>
                    Optional. A club can have several squads; you manage it
                    through your personal login.
                  </p>
                  <form
                    onSubmit={async (e) => {
                      const form = e.currentTarget;
                      const body = fields(e);
                      if (
                        await act(
                          "/clubs",
                          body,
                          "Club created. You can now create its squads.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <label>
                      Club name
                      <input
                        name="name"
                        required
                        maxLength={80}
                        placeholder="e.g. Riverside FC"
                      />
                    </label>
                    <button disabled={busy}>Create club</button>
                  </form>
                </section>
                <section className={s.card}>
                  <h2>Create a squad</h2>
                  <p className={s.muted}>
                    Independent teams are welcome. Each format has its own
                    rating.
                  </p>
                  <form
                    onSubmit={async (e) => {
                      const form = e.currentTarget;
                      const body = fields(e);
                      if (
                        await act(
                          "/squads",
                          body,
                          "Squad created. Invite players or wait for join requests.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <label>
                      Squad name
                      <input
                        name="name"
                        required
                        maxLength={80}
                        placeholder="e.g. Riverside First Team"
                      />
                    </label>
                    <div className={s.formRow}>
                      <label>
                        Format
                        <select name="format" defaultValue="11">
                          {["5", "7", "11"].map((f) => (
                            <option key={f} value={f}>
                              {f}-a-side
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Club
                        <select name="club">
                          <option value="">Independent squad</option>
                          {data.clubs
                            .filter((c: any) => c.owner === data.userId)
                            .map((c: any) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    <button disabled={busy}>Create squad</button>
                  </form>
                </section>
              </div>
              <section className={s.card}>
                <div className={s.heading}>
                  <div>
                    <p className={s.eyebrow}>RESULTS-BASED ELO</p>
                    <h2>Squad rankings</h2>
                  </div>
                  <label>
                    Match format
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      {["5", "7", "11"].map((f) => (
                        <option key={f} value={f}>
                          {f}-a-side
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank / Squad</th>
                        <th>Rating</th>
                        <th>W–D–L</th>
                        <th>Goals</th>
                        <th>Roster</th>
                      </tr>
                    </thead>
                    <tbody>
                      {squads
                        .filter((q) => q.format === format)
                        .map((q, i) => (
                          <tr key={q._id}>
                            <td>
                              <button
                                className={s.textButton}
                                onClick={() => setSelected(q._id)}
                              >
                                #{i + 1} {q.name}
                              </button>
                              <small>
                                {data.clubs.find((c: any) => c._id === q.club)
                                  ?.name || "Independent"}{" "}
                                ·{" "}
                                {q.played < 10 ? "Provisional" : "Established"}
                              </small>
                            </td>
                            <td>{ratingNumber(q.rating)}</td>
                            <td>
                              {q.wins}–{q.draws}–{q.losses}
                            </td>
                            <td>
                              {q.goalsFor}–{q.goalsAgainst}
                            </td>
                            <td>
                              {
                                q.members.filter((m) => m.status === "accepted")
                                  .length
                              }
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!squads.some((q) => q.format === format) && (
                  <p className={s.empty}>
                    No {format}-a-side squads yet. Create the first one.
                  </p>
                )}
                <p className={s.muted}>
                  All registered squads in this format, including teams with no
                  confirmed results. Starting rating: 800. Provisional for the
                  first 10 matches.
                </p>
              </section>
              {squad && (
                <section className={s.card}>
                  <div className={s.heading}>
                    <div>
                      <h2>{squad.name}</h2>
                      <p className={s.muted}>
                        {squad.format}-a-side · {ratingNumber(squad.rating)}{" "}
                        squad rating
                      </p>
                    </div>
                    <button
                      className={s.secondary}
                      onClick={() => setSelected("")}
                    >
                      Close squad
                    </button>
                  </div>
                  <h3>Accepted roster</h3>
                  {squad.members
                    .filter((m) => m.status === "accepted")
                    .map((m) => (
                      <div key={m.user} className={s.row}>
                        <button
                          className={s.textButton}
                          onClick={() => viewPlayer(m.user)}
                        >
                          {m.name} →
                        </button>
                        {(squad.manager === data.userId ||
                          m.user === data.userId) && (
                          <button
                            className={s.secondary}
                            disabled={busy}
                            onClick={() =>
                              act(
                                `/squads/${squad._id}/membership`,
                                {
                                  action:
                                    m.user === data.userId ? "leave" : "remove",
                                  playerId: m.user,
                                },
                                "Roster updated. Historical lineups are preserved.",
                              )
                            }
                          >
                            {m.user === data.userId
                              ? "Leave squad"
                              : "Remove player"}
                          </button>
                        )}
                      </div>
                    ))}
                  {!squad.members.some((m) => m.status === "accepted") && (
                    <p className={s.empty}>No accepted players yet.</p>
                  )}
                  {!squad.members.some(
                    (m) =>
                      m.user === data.userId &&
                      ["accepted", "requested", "invited"].includes(m.status),
                  ) && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          `/squads/${squad._id}/membership`,
                          { action: "request" },
                          "Join request sent to the squad manager.",
                        )
                      }
                    >
                      Request to join
                    </button>
                  )}
                  {squad.members
                    .filter(
                      (m) =>
                        m.user === data.userId &&
                        ["requested", "invited"].includes(m.status),
                    )
                    .map((m) => (
                      <p key={m.user} className={s.muted}>
                        Membership{" "}
                        {m.status === "requested"
                          ? "requested · awaiting manager acceptance"
                          : "invited · respond in your membership inbox"}
                        .
                      </p>
                    ))}
                  {squad.manager === data.userId && (
                    <form
                      onSubmit={async (e) => {
                        const form = e.currentTarget;
                        const body = fields(e);
                        if (
                          await act(
                            `/squads/${squad._id}/membership`,
                            { ...body, action: "invite" },
                            "Invitation sent. The player must accept it.",
                          )
                        )
                          form.reset();
                      }}
                    >
                      <label>
                        Invite a registered player by email
                        <input
                          type="email"
                          name="email"
                          required
                          placeholder="player@example.com"
                        />
                      </label>
                      <button disabled={busy}>Send invitation</button>
                    </form>
                  )}
                </section>
              )}
            </>
          )}
          {tab === "matches" && (
            <>
              <section className={s.card}>
                <h2>Challenge another squad</h2>
                <p className={s.muted}>
                  Only managers can challenge. Your opponent must accept, and
                  both teams must use the same format.
                </p>
                {mine.length ? (
                  <form
                    onSubmit={async (e) => {
                      const form = e.currentTarget;
                      const body = fields(e);
                      body.scheduledAt = new Date(
                        String(body.date),
                      ).toISOString();
                      delete body.date;
                      if (
                        await act(
                          "/matches",
                          body,
                          "Challenge sent to the opposing manager.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <div className={s.formRow}>
                      <label>
                        Your squad
                        <select name="home" required>
                          <option value="">Choose your squad</option>
                          {mine.map((q) => (
                            <option key={q._id} value={q._id}>
                              {q.name} · {q.format}-a-side
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Opponent
                        <select name="away" required>
                          <option value="">Choose opponent</option>
                          {squads
                            .filter((q) => q.manager !== data.userId)
                            .map((q) => (
                              <option key={q._id} value={q._id}>
                                {q.name} · {q.format}-a-side
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    <div className={s.formRow}>
                      <label>
                        Match date
                        <input type="datetime-local" name="date" required />
                      </label>
                      <label>
                        Venue
                        <input
                          name="venue"
                          maxLength={120}
                          placeholder="Agree a location with your opponent"
                        />
                      </label>
                    </div>
                    <label>
                      Tracking method
                      <select name="mode">
                        <option value="results">
                          Squad results only · no individual statistics
                        </option>
                        <option value="detailed">
                          Detailed · both managers record player lineups and
                          stats
                        </option>
                      </select>
                    </label>
                    <button disabled={busy}>Send challenge</button>
                  </form>
                ) : (
                  <p className={s.empty}>
                    Create a squad first to manage matches.
                  </p>
                )}
              </section>
              <section className={s.card}>
                <h2>Match centre</h2>
                <p className={s.muted}>
                  Latest 100 scheduled matches across all formats. Ratings
                  change only after opponent confirmation.
                </p>
                {data.matches.length === 0 && (
                  <p className={s.empty}>No challenges yet.</p>
                )}
                {data.matches.map((m: any) => {
                  const home = squads.find((q) => q._id === m.home),
                    away = squads.find((q) => q._id === m.away);
                  const own =
                    home?.manager === data.userId
                      ? home
                      : away?.manager === data.userId
                        ? away
                        : null;
                  const ownSide = own?._id === m.home ? "home" : "away";
                  return (
                    <article key={m._id} className={s.match}>
                      <div className={s.heading}>
                        <div>
                          <h3>
                            {name(m.home)} <span className={s.versus}>vs</span>{" "}
                            {name(m.away)}
                          </h3>
                          <small>
                            {m.format}-a-side ·{" "}
                            {new Date(m.scheduledAt).toLocaleString()} ·{" "}
                            {m.venue || "Venue to be agreed"}
                          </small>
                        </div>
                        <span className={s.badge}>{states[m.status]}</span>
                      </div>
                      <p className={s.muted}>
                        {m.mode === "detailed"
                          ? "Detailed tracking · team-recorded statistics"
                          : "Results only · no personal ability score inferred"}
                      </p>
                      {m.homeScore !== undefined && (
                        <p className={s.score}>
                          {m.homeScore} – {m.awayScore}
                          {m.status !== "completed" && (
                            <small>Proposed result</small>
                          )}
                        </p>
                      )}
                      {m.status === "completed" && (
                        <p className={s.muted}>
                          Squad Elo: {ratingNumber(m.ratingBefore[0])} →{" "}
                          {ratingNumber(m.ratingAfter[0])} /{" "}
                          {ratingNumber(m.ratingBefore[1])} →{" "}
                          {ratingNumber(m.ratingAfter[1])}
                        </p>
                      )}
                      {own &&
                        m.status === "challenge" &&
                        own._id === m.away && (
                          <div className={s.actions}>
                            {["accept", "decline"].map((action) => (
                              <button
                                key={action}
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    `/matches/${m._id}/${action}`,
                                    {},
                                    `Challenge ${action === "accept" ? "accepted" : "declined"}.`,
                                  )
                                }
                              >
                                {action === "accept"
                                  ? "Accept challenge"
                                  : "Decline challenge"}
                              </button>
                            ))}
                          </div>
                        )}
                      {own && ["scheduled", "disputed"].includes(m.status) && (
                        <>
                          {m.mode === "detailed" && (
                            <details className={s.details}>
                              <summary>
                                {`Record ${own.name} lineup & statistics`}
                              </summary>
                              <p className={s.muted}>
                                Select players who participated. Opponent
                                confirms the result, not each individual
                                statistic. Statistics remain labeled
                                team-recorded.
                              </p>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const f = new FormData(e.currentTarget);
                                  const players = own.members
                                    .filter((member) =>
                                      f.get(`play-${member.user}`),
                                    )
                                    .map((member) => ({
                                      user: member.user,
                                      position: f.get(
                                        `position-${member.user}`,
                                      ),
                                      minutes: Number(
                                        f.get(`minutes-${member.user}`),
                                      ),
                                      goals: Number(
                                        f.get(`goals-${member.user}`),
                                      ),
                                      assists: Number(
                                        f.get(`assists-${member.user}`),
                                      ),
                                    }));
                                  void act(
                                    `/matches/${m._id}/lineup`,
                                    { players },
                                    "Lineup saved.",
                                  );
                                }}
                              >
                                {own.members
                                  .filter(
                                    (member) => member.status === "accepted",
                                  )
                                  .map((member) => {
                                    const line = m[`${ownSide}Lineup`].find(
                                      (r: any) => r.user === member.user,
                                    );
                                    return (
                                      <div
                                        className={s.lineup}
                                        key={member.user}
                                      >
                                        <label className={s.check}>
                                          <input
                                            type="checkbox"
                                            name={`play-${member.user}`}
                                            defaultChecked={!!line}
                                          />
                                          {member.name}
                                        </label>
                                        <label>
                                          Position
                                          <select
                                            name={`position-${member.user}`}
                                            defaultValue={
                                              line?.position || "Midfielder"
                                            }
                                          >
                                            {positions.map((p) => (
                                              <option key={p}>{p}</option>
                                            ))}
                                          </select>
                                        </label>
                                        {[
                                          ["minutes", "Minutes", 120],
                                          ["goals", "Goals", 100],
                                          ["assists", "Assists", 100],
                                        ].map(([key, label, max]) => (
                                          <label key={key}>
                                            {label}
                                            <input
                                              type="number"
                                              name={`${key}-${member.user}`}
                                              defaultValue={line?.[key] ?? 0}
                                              min={0}
                                              max={max}
                                              step={1}
                                            />
                                          </label>
                                        ))}
                                      </div>
                                    );
                                  })}
                                <button disabled={busy}>Save lineup</button>
                              </form>
                            </details>
                          )}
                          <form
                            onSubmit={(e) => {
                              const body = fields(e);
                              void act(
                                `/matches/${m._id}/result`,
                                {
                                  homeScore: Number(body.homeScore),
                                  awayScore: Number(body.awayScore),
                                },
                                "Result submitted. The opposing manager must confirm or dispute it.",
                              );
                            }}
                          >
                            <div className={s.formRow}>
                              <label>
                                {name(m.home)} goals
                                <input
                                  name="homeScore"
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  required
                                />
                              </label>
                              <label>
                                {name(m.away)} goals
                                <input
                                  name="awayScore"
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  required
                                />
                              </label>
                            </div>
                            <button disabled={busy}>Submit result</button>
                          </form>
                        </>
                      )}
                      {own &&
                        m.status === "awaiting_confirmation" &&
                        (own._id === m.reporter ? (
                          <p className={s.muted}>
                            Waiting for the opposing manager to confirm or
                            dispute your result.
                          </p>
                        ) : (
                          <div className={s.actions}>
                            <button
                              disabled={busy}
                              onClick={() =>
                                act(
                                  `/matches/${m._id}/confirm`,
                                  {},
                                  "Result confirmed. Both squad ratings updated.",
                                )
                              }
                            >
                              Confirm result
                            </button>
                            <button
                              className={s.secondary}
                              disabled={busy}
                              onClick={() =>
                                act(
                                  `/matches/${m._id}/dispute`,
                                  {},
                                  "Result disputed. Resolve the score together and submit again.",
                                )
                              }
                            >
                              Dispute result
                            </button>
                          </div>
                        ))}
                      {m.mode === "detailed" && (
                        <details className={s.details}>
                          <summary>View recorded lineups &amp; stats</summary>
                          {["home", "away"].map((side) => (
                            <div key={side}>
                              <h3>{name(m[side])}</h3>
                              {m[`${side}Lineup`].map((r: any) => (
                                <div key={r.user} className={s.row}>
                                  <button
                                    className={s.textButton}
                                    onClick={() => viewPlayer(r.user)}
                                  >
                                    {r.name}
                                  </button>
                                  <span>
                                    {r.position} · {r.minutes} min · {r.goals}{" "}
                                    goals · {r.assists} assists
                                  </span>
                                </div>
                              ))}
                              {!m[`${side}Lineup`].length && (
                                <p className={s.muted}>Not yet recorded.</p>
                              )}
                            </div>
                          ))}
                        </details>
                      )}
                    </article>
                  );
                })}
              </section>
            </>
          )}
          {tab === "player" && (
            <>
              {!player ? (
                <button onClick={() => viewPlayer(data.userId)}>
                  Load my soccer profile
                </button>
              ) : (
                <section className={s.card}>
                  <div className={s.heading}>
                    <div>
                      <p className={s.eyebrow}>SOCCER PLAYER</p>
                      <h2>{player.player.name}</h2>
                      <p className={s.muted}>
                        {player.player.soccer?.position || "Position not set"} ·{" "}
                        {player.player.soccer?.foot
                          ? `${player.player.soccer.foot} foot`
                          : "Dominant foot not set"}
                      </p>
                    </div>
                    {player.player._id !== data.userId && (
                      <button
                        className={s.secondary}
                        onClick={() => viewPlayer(data.userId)}
                      >
                        My profile
                      </button>
                    )}
                  </div>
                  {player.player._id === data.userId && (
                    <form
                      onSubmit={async (e) => {
                        const body = fields(e);
                        if (
                          await act(
                            "/profile",
                            body,
                            "Soccer identity updated.",
                            "PATCH",
                          )
                        )
                          await viewPlayer(data.userId);
                      }}
                    >
                      <div className={s.formRow}>
                        <label>
                          Preferred position
                          <select
                            name="position"
                            defaultValue={
                              player.player.soccer?.position || "Midfielder"
                            }
                          >
                            {positions.map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Dominant foot
                          <select
                            name="foot"
                            defaultValue={player.player.soccer?.foot || "Right"}
                          >
                            {["Left", "Right", "Both"].map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button disabled={busy}>Save player identity</button>
                    </form>
                  )}
                  <h3>Club &amp; squad affiliations</h3>
                  {player.squads.map((q: any) => (
                    <div className={s.row} key={q._id}>
                      <span>
                        {q.club?.name ? `${q.club.name} · ` : ""}
                        {q.name} · {q.format}-a-side
                      </span>
                      <span>Squad rating {ratingNumber(q.rating)}</span>
                    </div>
                  ))}
                  {!player.squads.length && (
                    <p className={s.empty}>
                      No accepted squad affiliations yet. Request to join a
                      squad to get started.
                    </p>
                  )}
                  <div className={s.heading}>
                    <h3>Individual performance</h3>
                    <label>
                      Format
                      <select
                        value={profileFormat}
                        onChange={(e) => setProfileFormat(e.target.value)}
                      >
                        {["5", "7", "11"].map((f) => (
                          <option key={f} value={f}>
                            {f}-a-side
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className={s.metrics}>
                    {[
                      ["Appearances", appearances.length],
                      [
                        "Minutes",
                        appearances.reduce(
                          (n: number, r: any) => n + r.minutes,
                          0,
                        ),
                      ],
                      [
                        "Goals",
                        appearances.reduce(
                          (n: number, r: any) => n + r.goals,
                          0,
                        ),
                      ],
                      [
                        "Assists",
                        appearances.reduce(
                          (n: number, r: any) => n + r.assists,
                          0,
                        ),
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <p className={s.muted}>{player.source}</p>
                  <p className={s.muted}>
                    Only detailed matches with confirmed results count here.
                    Results-only matches contribute to squad Elo, not personal
                    statistics. No personal ability score is inferred from team
                    success.
                  </p>
                  {appearances.map((r: any) => (
                    <div className={s.row} key={r.matchId}>
                      <span>
                        {new Date(r.date).toLocaleDateString()} · {r.position}
                      </span>
                      <span>
                        {r.minutes} min · {r.goals} goals · {r.assists} assists
                      </span>
                    </div>
                  ))}
                  {!appearances.length && (
                    <p className={s.empty}>
                      No recorded appearances in confirmed {profileFormat}
                      -a-side matches yet.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          <details className={s.explanation}>
            <summary>How soccer ratings and statistics work</summary>
            <p>
              Squads start at 800, separately for each format. Confirmed wins,
              draws and losses update Elo against the opponent’s current
              strength, using K=32. Goal difference has a capped multiplier of
              1.25. Squad ratings stay between 0 and 1,500 and are provisional
              for 10 matches. Results-only mode needs no player statistics.
              Detailed mode requires both managers’ lineups and records minutes,
              positions, goals and assists. Individual statistics are
              team-recorded, not independently verified. They do not generate an
              individual ability rating. Historical match lineups remain intact
              after a player leaves a squad. Squad managers are the creating
              accounts; club ownership does not grant roster membership.
            </p>
          </details>
        </>
      )}
    </main>
  );
}
