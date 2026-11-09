"use client";

import { Suspense } from "react";
import IndividualCompetition from "@/components/IndividualCompetition";
import TeamCompetition from "@/components/TeamCompetition";
import { TEAM_SPORTS } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function CompetePage() {
  return (
    <Suspense fallback={<p role="status">Loading competition…</p>}>
      <CompetitionRouter />
    </Suspense>
  );
}

function CompetitionRouter() {
  const params = useSearchParams();
  const teams = params.get("section") === "teams";
  const sport = TEAM_SPORTS.includes(params.get("sport") || "")
    ? params.get("sport")!
    : "Soccer";
  return (
    <>
      <nav className={styles.competitionModes} aria-label="Competition type">
        <Link href="/compete" aria-current={!teams ? "page" : undefined}>
          Individual sports
        </Link>
        <Link
          href="/compete?section=teams"
          aria-current={teams ? "page" : undefined}
        >
          Team sports
        </Link>
      </nav>
      {teams ? (
        <TeamCompetition sport={sport} key={sport} />
      ) : (
        <IndividualCompetition />
      )}
    </>
  );
}
