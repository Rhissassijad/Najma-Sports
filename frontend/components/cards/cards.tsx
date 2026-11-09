"use client";
import { individualDiscipline, performanceValue } from "@/lib/sports";
import { ratingNumber } from "@/components/RatingPanels";
import s from "./cards.module.css";
export default function MatchCard({
  match,
  sport = "Tennis",
}: {
  match: any;
  sport?: string;
}) {
  const d = individualDiscipline(sport, match.discipline),
    score = match.proposedScore || match.score,
    assign = match.sideAssignments?.length ? match.sideAssignments : [0, 1];
  const value = (side: number) =>
    score?.values
      ? performanceValue(score.values[side], score.type)
      : Array.isArray(score)
        ? score[side]
        : (score?.points?.[side] ??
          score?.sets?.map((set: number[]) => set[side]).join(" / ") ??
          "—");
  const states: any = {
    open: "Waiting for participants",
    awaiting_result: "Ready for a result",
    awaiting_confirmation: "Awaiting participant confirmation",
    completed: "Confirmed",
  };
  return (
    <article className={s.card}>
      <div className={s.accentBar} />
      <div className={s.body}>
        <header className={s.header}>
          <div>
            <h3 className={s.venue}>{match.venue || sport}</h3>
            <p className={s.meta}>
              {sport} · {d?.label || match.discipline || "Singles"}
            </p>
          </div>
          <div className={s.headerRight}>
            <span className={s.status}>
              {states[match.status] || "Recorded result"}
            </span>
            <p className={s.date}>
              {new Date(
                match.scheduledAt || match.createdAt,
              ).toLocaleDateString()}
            </p>
          </div>
        </header>
        <div className={s.results}>
          {[0, 1].map((side) => (
            <div
              key={side}
              className={`${s.playerRow} ${match.status === "completed" && match.winner === side ? s.playerRowWinner : s.playerRowDefault}`}
            >
              <div>
                <small>Side {side + 1}</small>
                {(match.players || [])
                  .filter((_: any, i: number) => assign[i] === side)
                  .map((p: any) => (
                    <div key={p._id}>
                      <strong className={s.playerName}>
                        {p.name || "Player"}
                      </strong>
                      {d?.mode === "racket" && (
                        <p className={s.ratingLine}>
                          Rating {ratingNumber(p.rating)}
                          {typeof p.ratingChange === "number"
                            ? ` · ${p.ratingChange > 0 ? "+" : ""}${ratingNumber(p.ratingChange)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  ))}
                {(match.players || []).filter(
                  (_: any, i: number) => assign[i] === side,
                ).length < (d?.sideSize || 1) && (
                  <p className={s.meta}>Open place</p>
                )}
              </div>
              <strong className={s.score}>{value(side)}</strong>
            </div>
          ))}
        </div>
        <footer className={s.footer}>
          <span>
            {d?.mode === "time"
              ? "Times in minutes:seconds"
              : d?.mode === "strokes"
                ? "Gross stroke play"
                : "Ratings are specific to this discipline"}
          </span>
          {match.status === "completed" && match.winner === null && (
            <span>Tied result</span>
          )}
        </footer>
      </div>
    </article>
  );
}
