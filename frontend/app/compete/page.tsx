"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MatchCard from "@/components/cards/cards";
import { useAuthGuard } from "@/lib/withAuth";
import styles from "./page.module.css";

type Section =
  | "find-players"
  | "matches"
  | "rating"
  | "leaderboard"
  | "venues"
  | "tournaments";

export default function CompetePage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");
  const [section, setSection] = useState<Section>("find-players");

  const [data, setData] = useState<any>({
    user: null,
    matches: [],
    ratings: [],
    leaderboard: [],
  });

  useEffect(() => {
  const safeFetch = async (url: string, token?: string) => {
    const res = await fetch(url, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

    const contentType = res.headers.get("content-type");

    // 🔴 Detect HTML / errors BEFORE parsing JSON
    if (!res.ok || !contentType?.includes("application/json")) {
      const text = await res.text();
      console.error("❌ API ERROR:", {
        url,
        status: res.status,
        contentType,
        response: text,
      });
      throw new Error(`Invalid response from ${url}`);
    }

    return res.json();
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // USER
      const userJson = await safeFetch(
        "http://localhost:8080/api/users/me",
        token
      );

      // LEADERBOARD
      const lbData = await safeFetch(
        "http://localhost:8080/api/leaderboard/69ca14f5807a21a113ee9cd9"
      );

      // MATCHES (REAL DB SOURCE)
      const matchData = await safeFetch(
        "http://localhost:8080/api/matches/my",
        token
      );

      setData({
        user: userJson?.user || userJson || null,
        ratings: Array.isArray(userJson?.ratings) ? userJson.ratings : [],

        matches: Array.isArray(matchData) ? matchData : [],

        leaderboard:
            Array.isArray(lbData)
                ? lbData
                : Array.isArray(lbData?.players)
                ? lbData.players
                : Array.isArray(lbData?.data)
                    ? lbData.data
                    : [],
      });

    } catch (err) {
      console.error("❌ Compete page fetch error:", err);
    }
  };

  fetchData();
}, []);
  const { user, matches, ratings, leaderboard } = data;

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>

        {/* SIDEBAR */}
        <Sidebar
          section={section}
          setSection={setSection}
          user={user}
        />

        {/* MAIN CONTENT */}
        <div className={styles.main}>
          <div className={styles.mainInner}>

            {/* PROFILE CARD */}
            <div className={styles.profileCard}>
              <h1 className={styles.profileName}>
                {user?.name || "Loading..."}
              </h1>

              <div className={styles.ratingsGrid}>
                {ratings.length > 0 ? (
                  ratings.map((r: any) => (
                    <div key={r._id}>
                      <p className={styles.sportLabel}>
                        {r.sportId?.name || "Sport"}
                      </p>
                      <p className={styles.ratingValue}>
                        {r.currentRating}
                      </p>
                      <p className={styles.matchesPlayed}>
                        {r.matchesPlayed} matches
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyStateText}>No ratings yet</p>
                )}
              </div>
            </div>

            {/* MATCHES SECTION - Using Professional MatchCard */}
{section === "matches" && (
  <div>
    <div className={styles.matchesHeader}>
      <h2 className={styles.matchesTitle}>My Matches</h2>
      
      {matches.length > 0 && (
        <p className={styles.matchesCount}>
          {matches.length} match{matches.length > 1 ? 'es' : ''} found
        </p>
      )}
    </div>

    {matches.length > 0 ? (
      <div className={styles.matchesList}>
        {matches.map((m: any) => (
          <MatchCard 
            key={m._id} 
            match={m} 
            sport="Tennis" 
          />
        ))}
      </div>
    ) : (
      <div className={styles.emptyMatchesCard}>
        <div className={styles.emptyMatchesIconWrap}>
          🎾
        </div>
        <h3 className={styles.emptyMatchesTitle}>No matches yet</h3>
        <p className={styles.emptyMatchesDesc}>
          You haven't played any matches yet. Start competing to see your match history here.
        </p>
      </div>
    )}
  </div>
)}
            {/* LEADERBOARD */}
            {section === "leaderboard" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitleWithGap}>Leaderboard</h2>

                {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                  leaderboard.slice(0, 10).map((p: any, i: number) => (
                    <div key={p._id} className={styles.leaderboardRow}>
                      <span>
                        #{i + 1} {p.userId?.name || p.name}
                      </span>
                      <span>{p.currentRating}</span>
                    </div>
                  ))
                ) : (
                  <p>No leaderboard data</p>
                )}
              </div>
            )}

            {/* OTHER SECTIONS (UNCHANGED) */}
            {section === "rating" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Ratings</h2>
              </div>
            )}

            {section === "venues" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Venues</h2>
              </div>
            )}

            {section === "tournaments" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Tournaments</h2>
              </div>
            )}

            {section === "find-players" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Find Players</h2>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
