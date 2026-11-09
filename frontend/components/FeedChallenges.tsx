"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { feedRequest } from "./PostInteractions";
import s from "./PostInteractions.module.css";
export default function FeedChallenges({
  token,
  userId,
  revision,
}: {
  token: string | null;
  userId: string | null;
  revision: number;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    if (!token) return;
    setError("");
    try {
      setRows(await feedRequest("/challenges", token));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (token && userId) void load();
  }, [token, userId, revision]);
  async function respond(id: string, action: string) {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      await feedRequest(`/challenges/${id}/${action}`, token, {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!token || !userId) return null;
  return (
    <details className={s.inbox}>
      <summary>
        Challenge inbox ·{" "}
        {
          rows.filter((r) => r.status === "pending" && r.to?._id === userId)
            .length
        }{" "}
        incoming
      </summary>
      <button disabled={!!busy} onClick={load}>
        Refresh challenges
      </button>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {!rows.length && (
        <p className={s.notice}>
          No challenges yet. Challenge a player from their post.
        </p>
      )}
      {rows.map((r) => (
        <article key={r._id} className={s.comment}>
          <strong>
            {r.from?.name || "Player"} → {r.to?.name || "Player"}
          </strong>
          <p>
            {r.sport}
            {r.fromSquad
              ? ` · ${r.fromSquad.name} vs ${r.toSquad?.name}`
              : ` · ${r.discipline}`}{" "}
            · {r.status}
          </p>
          {r.scheduledAt && (
            <small>{new Date(r.scheduledAt).toLocaleString()}</small>
          )}
          <div className={s.actions}>
            {r.status === "pending" &&
              (r.to?._id === userId ? ["accept", "decline"] : ["cancel"]).map(
                (action) => (
                  <button
                    key={action}
                    disabled={!!busy}
                    onClick={() => respond(r._id, action)}
                  >
                    {action === "accept"
                      ? "Accept challenge"
                      : action === "decline"
                        ? "Decline challenge"
                        : "Cancel challenge"}
                  </button>
                ),
              )}
            {r.status === "accepted" && (r.match || r.teamMatch) && (
              <Link
                className={s.matchLink}
                href={
                  r.kind === "team"
                    ? `/compete?section=teams&sport=${encodeURIComponent(r.sport)}&view=matches`
                    : `/compete?section=matches&sport=${r.sportId}&discipline=${encodeURIComponent(r.discipline)}`
                }
              >
                Open match →
              </Link>
            )}
          </div>
        </article>
      ))}
    </details>
  );
}
