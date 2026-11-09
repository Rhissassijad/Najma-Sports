// components/ui/MatchCard.tsx
"use client";

import React from "react";
import { ratingNumber } from "@/components/RatingPanels";
import styles from "./cards.module.css";

interface Player {
  name?: string;
  rating?: number;
  ratingChange?: number | null;
}

interface Match {
  _id: string;
  venue?: string;
  type?: string;
  createdAt?: string;
  scheduledAt?: string;
  players?: Player[];
  score?:
    | {
        type?: string;
        points?: number[];
        sets?: number[][];
      }
    | number[];
  proposedScore?: {
    type?: string;
    points?: number[];
    sets?: number[][];
  } | null;
  winner?: number;
  status?: "open" | "awaiting_result" | "awaiting_confirmation" | "completed";
}

interface MatchCardProps {
  match: Match;
  sport?: string;
}

export default function MatchCard({ match, sport = "Tennis" }: MatchCardProps) {
  const player1 = match.players?.[0];
  const player2 = match.players?.[1];
  const isCompleted =
    match.status === "completed" ||
    (match.winner !== null && match.winner !== undefined);
  const pendingScore =
    match.status === "awaiting_confirmation" ? match.proposedScore : null;
  const score = pendingScore || match.score;
  const scoreForPlayer = (playerIndex: number) => {
    if (Array.isArray(score)) return score[playerIndex] ?? "—";
    if (score?.type === "standard") return score.points?.[playerIndex] ?? "—";
    if (score?.type === "sets" && Array.isArray(score.sets)) {
      return score.sets.map((set) => set[playerIndex]).join(" / ");
    }
    return "—";
  };
  const statusText = {
    open: "Waiting for a player",
    awaiting_result: "Match is ready",
    awaiting_confirmation: "Confirm reported result",
    completed: "Completed",
  }[match.status || (isCompleted ? "completed" : "open")];
  const matchDate = match.scheduledAt || match.createdAt;
  const winnerIndex = isCompleted ? match.winner : null;

  const isPlayer1Winner = winnerIndex === 0;
  const isPlayer2Winner = winnerIndex === 1;

  return (
    <div className={styles.card}>
      {/* Subtle Top Accent Bar */}
      <div className={styles.accentBar} />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.sportIcon}>🎾</div>
            <div>
              <p className={styles.venue}>
                {match.venue ? match.venue : "Exhibition Match"}
              </p>
              <p className={styles.meta}>
                {sport} • {match.type || "Friendly"}
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <p className={styles.status}>{statusText}</p>
            <p className={styles.date}>
              {matchDate
                ? new Date(matchDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Unknown date"}
            </p>
          </div>
        </div>

        {/* Match Result */}
        <div className={styles.results}>
          {/* Player 1 Row */}
          <div
            className={`${styles.playerRow} ${
              isPlayer1Winner ? styles.playerRowWinner : styles.playerRowDefault
            }`}
          >
            <div className={styles.playerLeft}>
              <div className={styles.avatar}>👤</div>
              <div>
                <p
                  className={`${styles.playerName} ${isPlayer1Winner ? styles.playerNameWinner : styles.playerNameDefault}`}
                >
                  {player1?.name || "Player 1"}
                </p>
                <p className={styles.ratingLine}>
                  Rating •{" "}
                  <span className={styles.ratingValue}>
                    {ratingNumber(player1?.rating)}
                  </span>
                </p>
              </div>
            </div>

            <div className={styles.scoreBox}>
              <p className={styles.score}>{scoreForPlayer(0)}</p>
              {typeof player1?.ratingChange === "number" &&
                player1.ratingChange !== 0 && (
                  <p
                    className={`${styles.ratingChange} ${
                      player1.ratingChange > 0
                        ? styles.ratingUp
                        : styles.ratingDown
                    }`}
                  >
                    {player1.ratingChange > 0 ? "↑" : "↓"}{" "}
                    {ratingNumber(Math.abs(player1.ratingChange))}
                  </p>
                )}
            </div>
          </div>

          {/* Player 2 Row */}
          <div
            className={`${styles.playerRow} ${
              isPlayer2Winner ? styles.playerRowWinner : styles.playerRowDefault
            }`}
          >
            <div className={styles.playerLeft}>
              <div className={styles.avatar}>👤</div>
              <div>
                <p
                  className={`${styles.playerName} ${isPlayer2Winner ? styles.playerNameWinner : styles.playerNameDefault}`}
                >
                  {player2?.name || "Player 2"}
                </p>
                <p className={styles.ratingLine}>
                  Rating •{" "}
                  <span className={styles.ratingValue}>
                    {ratingNumber(player2?.rating)}
                  </span>
                </p>
              </div>
            </div>

            <div className={styles.scoreBox}>
              <p className={styles.score}>{scoreForPlayer(1)}</p>
              {typeof player2?.ratingChange === "number" &&
                player2.ratingChange !== 0 && (
                  <p
                    className={`${styles.ratingChange} ${
                      player2.ratingChange > 0
                        ? styles.ratingUp
                        : styles.ratingDown
                    }`}
                  >
                    {player2.ratingChange > 0 ? "↑" : "↓"}{" "}
                    {ratingNumber(Math.abs(player2.ratingChange))}
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.footerDot} />
            {isCompleted ? "Match Completed" : statusText}
          </div>
          {sport && (
            <div className={styles.sportTag}>{sport.toUpperCase()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
