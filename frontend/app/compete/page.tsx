"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MatchCard from "@/components/cards/cards";
import { useAuthGuard } from "@/lib/withAuth";
import { API_URL } from "@/lib/api";
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
  const [selectedSportId, setSelectedSportId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [pageError, setPageError] = useState("");

  const [data, setData] = useState<any>({
    user: null,
    matches: [],
    openMatches: [],
    ratings: [],
    sportsCatalog: [],
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
      throw new Error(
        `Request failed (${res.status}) for ${url}: ${text || "Invalid server response"}`
      );
    }

    return res.json();
  };

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPageError("You must be logged in to load competition data.");
      return;
    }

    const results = await Promise.allSettled([
      safeFetch(`${API_URL}/api/users/me`, token),
      safeFetch(`${API_URL}/api/sports`),
      safeFetch(`${API_URL}/api/matches/my`, token),
      safeFetch(`${API_URL}/api/matches/open`, token),
    ]);
    const [userResult, sportsResult, matchesResult, openMatchesResult] = results;
    const userJson = userResult.status === "fulfilled" ? userResult.value : null;
    const sportsCatalog =
      sportsResult.status === "fulfilled" && Array.isArray(sportsResult.value)
        ? sportsResult.value
        : [];
    const matches =
      matchesResult.status === "fulfilled" && Array.isArray(matchesResult.value)
        ? matchesResult.value
        : [];
    const openMatches =
      openMatchesResult.status === "fulfilled" &&
      Array.isArray(openMatchesResult.value)
        ? openMatchesResult.value
        : [];

    setData({
      user: userJson?.user || userJson || null,
      ratings: Array.isArray(userJson?.ratings) ? userJson.ratings : [],
      matches,
      openMatches,
      sportsCatalog,
      leaderboard: [],
    });
    const firstRatedSportId = userJson?.ratings?.[0]?.sportId?._id;
    setSelectedSportId(firstRatedSportId || sportsCatalog[0]?._id || "");

    const failures = results
      .filter((result) => result.status === "rejected")
      .map((result) =>
        result.status === "rejected" && result.reason instanceof Error
          ? result.reason.message
          : "One or more competition data requests failed."
      );
    if (failures.length > 0) setPageError(failures.join(" "));
  };

  void fetchData().catch((error) => {
    console.error("Competition page fetch error:", error);
    setPageError(
      error instanceof Error ? error.message : "Unable to load competition data."
    );
  });
}, []);
  const { user, matches, ratings, leaderboard } = data;

  useEffect(() => {
    if (!selectedSportId) return;

    const loadLeaderboard = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/leaderboard/${selectedSportId}`
        );
        if (!response.ok) {
          throw new Error("Unable to load the selected sport leaderboard.");
        }
        const rows = await response.json();
        setData((previous: any) => ({
          ...previous,
          leaderboard: Array.isArray(rows) ? rows : [],
        }));
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
        setActionError(
          error instanceof Error ? error.message : "Unable to load leaderboard."
        );
      }
    };

    loadLeaderboard();
  }, [selectedSportId]);

  const refreshMatches = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [myResponse, openResponse] = await Promise.all([
      fetch(`${API_URL}/api/matches/my`, { headers }),
      fetch(`${API_URL}/api/matches/open`, { headers }),
    ]);
    if (!myResponse.ok || !openResponse.ok) {
      throw new Error("Unable to refresh match data.");
    }
    const [myMatches, openMatches] = await Promise.all([
      myResponse.json(),
      openResponse.json(),
    ]);
    setData((previous: any) => ({
      ...previous,
      matches: Array.isArray(myMatches) ? myMatches : [],
      openMatches: Array.isArray(openMatches) ? openMatches : [],
    }));
  };

  const postMatchAction = async (
    path: string,
    body?: Record<string, unknown>
  ) => {
    setActionError("");
    setActionMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in.");

      const response = await fetch(`${API_URL}/api/matches/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Match request failed.");
      }

      await refreshMatches(token);
      setActionMessage("Match updated successfully.");
    } catch (error) {
      console.error("Match action error:", error);
      setActionError(
        error instanceof Error ? error.message : "Match request failed."
      );
    }
  };

  const createMatch = async () => {
    if (!selectedSportId || isCreatingMatch) return;

    setIsCreatingMatch(true);
    await postMatchAction("", { sport: selectedSportId });
    setIsCreatingMatch(false);
  };

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
            {pageError && (
              <p className={styles.actionError} role="alert">
                {pageError}
              </p>
            )}

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
{(section === "matches" || section === "find-players") && (
  <div>
    <div className={styles.matchesHeader}>
      <h2 className={styles.matchesTitle}>
        {section === "matches" ? "My Matches" : "Find a Match"}
      </h2>
      
      {matches.length > 0 && (
        <p className={styles.matchesCount}>
          {matches.length} match{matches.length > 1 ? 'es' : ''} found
        </p>
      )}
    </div>

    <section className={`${styles.sectionCard} ${styles.matchControls}`}>
      <h3 className={styles.sectionTitle}>Create a competitive match</h3>
      <div className={styles.actionRow}>
        <label htmlFor="match-sport">Sport</label>
        <select
          id="match-sport"
          value={selectedSportId}
          onChange={(event) => setSelectedSportId(event.target.value)}
          disabled={isCreatingMatch}
        >
          <option value="">Choose a sport</option>
          {data.sportsCatalog.map((sport: any) => (
            <option key={sport._id} value={sport._id}>{sport.name}</option>
          ))}
        </select>
        <button
          type="button"
          className={styles.actionButton}
          onClick={createMatch}
          disabled={!selectedSportId || isCreatingMatch}
        >
          {isCreatingMatch ? "Creating..." : "Create open match"}
        </button>
      </div>
      {actionError && <p className={styles.actionError} role="alert">{actionError}</p>}
      {actionMessage && <p className={styles.actionMessage} role="status">{actionMessage}</p>}
    </section>

    <section className={styles.matchSection}>
      <h3 className={styles.sectionTitle}>Available matches</h3>
      {data.openMatches.length > 0 ? (
        <div className={styles.matchesList}>
          {data.openMatches.map((match: any) => (
            <div key={match._id} className={styles.matchItem}>
              <MatchCard match={match} sport={match.sport?.name || "Sport"} />
              {match.status === "open" &&
                !match.players?.some(
                  (player: any) => String(player._id) === String(user?._id)
                ) && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => postMatchAction(`${match._id}/join`)}
                  >
                    Join match
                  </button>
                )}
              {match.status === "awaiting_result" &&
                match.players?.some(
                  (player: any) => String(player._id) === String(user?._id)
                ) && (
                  <form
                    className={styles.resultForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const fields = new FormData(event.currentTarget);
                      const scoreType = String(fields.get("score-type"));
                      let score: { type: string; points?: number[]; sets?: number[][] };

                      if (scoreType === "sets") {
                        const rawSets = String(fields.get("set-scores") || "");
                        const sets = rawSets.split(",").map((set) =>
                          set.trim().split("-").map((points) => Number(points.trim()))
                        );
                        if (
                          !rawSets.trim() ||
                          sets.some(
                            (set) =>
                              set.length !== 2 ||
                              set.some((points) => !Number.isFinite(points) || points < 0)
                          )
                        ) {
                          setActionError("Enter set scores as 6-4, 3-6, 6-2.");
                          return;
                        }
                        score = { type: "sets", sets };
                      } else {
                        const rawPoints = [
                          String(fields.get("player-one-score") || ""),
                          String(fields.get("player-two-score") || ""),
                        ];
                        const points = rawPoints.map(Number);
                        if (
                          rawPoints.some((value) => !value.trim()) ||
                          points.some((value) => !Number.isFinite(value) || value < 0)
                        ) {
                          setActionError("Enter a valid score for both players.");
                          return;
                        }
                        score = { type: "standard", points };
                      }

                      void postMatchAction(`${match._id}/result`, {
                        score,
                      });
                    }}
                  >
                    <label className={styles.scoreTypeLabel}>
                      Score format
                      <select name="score-type" defaultValue="standard">
                        <option value="standard">Points</option>
                        <option value="sets">Sets</option>
                      </select>
                    </label>
                    <fieldset className={styles.scoreFields}>
                      <legend>Points score</legend>
                      <label>
                        Player 1
                        <input name="player-one-score" type="number" min="0" />
                      </label>
                      <label>
                        Player 2
                        <input name="player-two-score" type="number" min="0" />
                      </label>
                    </fieldset>
                    <label>
                      Set scores
                      <input name="set-scores" placeholder="6-4, 3-6, 6-2" />
                    </label>
                    <button type="submit" className={styles.actionButton}>
                      Submit result for confirmation
                    </button>
                  </form>
                )}
              {match.status === "awaiting_confirmation" &&
                match.players?.some(
                  (player: any) => String(player._id) === String(user?._id)
                ) &&
                String(match.resultReporter?._id) !== String(user?._id) && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() =>
                      postMatchAction(`${match._id}/confirm-result`)
                    }
                  >
                    Confirm result
                  </button>
                )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyMatchesCard}>
          <h3 className={styles.emptyMatchesTitle}>No open matches yet</h3>
          <p className={styles.emptyMatchesDesc}>
            Create one above and another player can join.
          </p>
        </div>
      )}
    </section>

    {section === "matches" && (
    <section className={styles.matchSection}>
      <div className={styles.matchesHeader}>
        <h3 className={styles.matchesTitle}>My match history</h3>
      </div>
    {matches.length > 0 ? (
      <div className={styles.matchesList}>
        {matches.map((m: any) => (
          <MatchCard key={m._id} match={m} sport={m.sport?.name || "Sport"} />
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
    </section>
    )}
  </div>
)}
            {/* LEADERBOARD */}
            {section === "leaderboard" && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitleWithGap}>Leaderboard</h2>

                <label className={styles.leaderboardSportLabel} htmlFor="leaderboard-sport">
                  Sport
                </label>
                <select
                  id="leaderboard-sport"
                  className={styles.leaderboardSportSelect}
                  value={selectedSportId}
                  onChange={(event) => setSelectedSportId(event.target.value)}
                >
                  {data.sportsCatalog.map((sport: any) => (
                    <option key={sport._id} value={sport._id}>{sport.name}</option>
                  ))}
                </select>

                {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                  leaderboard.slice(0, 10).map((p: any, i: number) => (
                    <div key={p._id} className={styles.leaderboardRow}>
                      <span>
                        #{p.rank || i + 1} {p.userId?.name || p.name}
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
