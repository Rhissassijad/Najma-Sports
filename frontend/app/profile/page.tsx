"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import MatchCard from "@/components/cards/cards";
import { useAuthGuard } from "@/lib/withAuth";
import styles from "./page.module.css";

type ProfileSection =
  | "overview"
  | "activity"
  | "sports-levels"
  | "settings"
  | "privacy";

const profileSections: { key: ProfileSection; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "My Activity" },
  { key: "sports-levels", label: "My Sports & Levels" },
  { key: "settings", label: "Settings" },
  { key: "privacy", label: "Privacy" },
];

function getAge(value?: string | number): string {
  if (value === undefined || value === null) return "Not set";
  if (typeof value === "number") return String(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age > 0 ? String(age) : "Not set";
}

export default function ProfilePage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");

  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");

  const [data, setData] = useState<any>({
    user: null,
    matches: [],
    ratings: [],
    leaderboard: [],
  });

  useEffect(() => {
    const safeFetch = async (url: string, token?: string) => {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("application/json")) {
        const text = await res.text();
        console.error("API ERROR", { url, status: res.status, contentType, response: text });
        throw new Error(`Invalid response from ${url}`);
      }

      return res.json();
    };

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const userJson = await safeFetch("http://localhost:8080/api/users/me", token);
        const lbData = await safeFetch("http://localhost:8080/api/leaderboard/69ca14f5807a21a113ee9cd9");
        const matchData = await safeFetch("http://localhost:8080/api/matches/my", token);

        const userBase = userJson?.user || userJson || null;
        const followersCount =
          typeof userJson?.followersCount === "number"
            ? userJson.followersCount
            : Array.isArray(userBase?.followers)
            ? userBase.followers.length
            : 0;
        const followingCount =
          typeof userJson?.followingCount === "number"
            ? userJson.followingCount
            : Array.isArray(userBase?.following)
            ? userBase.following.length
            : 0;

        setData({
          user: userBase
            ? {
                ...userBase,
                followersCount,
                followingCount,
              }
            : null,
          ratings: Array.isArray(userJson?.ratings) ? userJson.ratings : [],
          matches: Array.isArray(matchData) ? matchData : [],
          leaderboard: Array.isArray(lbData)
            ? lbData
            : Array.isArray(lbData?.players)
            ? lbData.players
            : Array.isArray(lbData?.data)
            ? lbData.data
            : [],
        });
      } catch (err) {
        console.error("Profile page fetch error", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (profileImagePreview && profileImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (profileImagePreview && profileImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setSelectedImageName(file.name);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const { user, matches, ratings, leaderboard } = data;

  const accountTypeRaw = user?.accountType || user?.role || (user?.isAthlete ? "Athlete" : "Fan");
  const accountType =
    typeof accountTypeRaw === "string" ? accountTypeRaw : accountTypeRaw ? String(accountTypeRaw) : "Fan";
  const isAthlete = accountType.toLowerCase().includes("athlete");

  const sportsPlayed = useMemo(() => {
    const fromProfile = Array.isArray(user?.sports)
      ? user.sports
          .map((sport: any) => sport?.name || sport?.sportId?.name || sport?.sport?.name || sport)
          .filter(Boolean)
      : [];

    const fromRatings = Array.isArray(ratings)
      ? ratings.map((r: any) => r?.sportId?.name || r?.sport?.name).filter(Boolean)
      : [];

    return Array.from(new Set([...fromProfile, ...fromRatings])) as string[];
  }, [ratings, user?.sports]);

  const profilePicture = profileImagePreview || user?.profilePicture || user?.avatarUrl || null;

  const overviewFields = [
    { label: "User Type", value: accountType || "Not set" },
    { label: "Followers", value: String(user?.followersCount ?? 0) },
    { label: "Following", value: String(user?.followingCount ?? 0) },
    { label: "Age", value: getAge(user?.age || user?.dateOfBirth || user?.dob) },
    { label: "Nationality", value: user?.nationality || "Not set" },
    { label: "City", value: user?.city || user?.location?.city || "Not set" },
    { label: "Height", value: user?.height ? `${user.height} cm` : "Not set" },
    { label: "Weight", value: user?.weight ? `${user.weight} kg` : "Not set" },
    { label: "Favorite Player", value: user?.favoritePlayer || "Not set" },
  ];

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>Profile</h2>
            </div>

            <ul className={styles.sidebarList}>
              {profileSections.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`${styles.sidebarButton} ${activeSection === item.key ? styles.sidebarButtonActive : ""}`}
                    onClick={() => setActiveSection(item.key)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className={styles.main}>
          <div className={styles.mainInner}>
            {activeSection === "overview" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>Overview</h1>

                <div className={styles.overviewTop}>
                  <div className={styles.profilePictureBlock}>
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className={styles.profilePicture} />
                    ) : (
                      <div className={styles.profileFallback}>{(user?.name || user?.email || "U")[0]?.toUpperCase()}</div>
                    )}

                    <label className={styles.uploadButton}>
                      Change Profile Picture
                      <input
                        type="file"
                        accept="image/*"
                        className={styles.hiddenInput}
                        onChange={handleProfileImageChange}
                      />
                    </label>

                    {selectedImageName && <p className={styles.uploadInfo}>Selected: {selectedImageName}</p>}
                  </div>

                  <div className={styles.identityBlock}>
                    <h2 className={styles.playerName}>{user?.name || "Player"}</h2>
                    <p className={styles.playerMeta}>{user?.email || "No email set"}</p>
                    <p className={styles.playerMeta}>
                      {user?.followersCount ?? 0} Followers • {user?.followingCount ?? 0} Following
                    </p>
                  </div>
                </div>

                <div className={styles.infoGrid}>
                  {overviewFields.map((field) => (
                    <div key={field.label} className={styles.infoCard}>
                      <p className={styles.infoLabel}>{field.label}</p>
                      <p className={styles.infoValue}>{field.value}</p>
                    </div>
                  ))}
                </div>

                {isAthlete && (
                  <div className={styles.noteCard}>
                    <h3 className={styles.noteTitle}>Sports Played</h3>
                    {sportsPlayed.length > 0 ? (
                      <p className={styles.noteText}>{sportsPlayed.join(" • ")}</p>
                    ) : (
                      <p className={styles.noteText}>No sports added yet.</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeSection === "activity" && (
              <section className={styles.sectionCard}>
                <div className={styles.activityHeader}>
                  <h1 className={styles.sectionTitle}>My Activity</h1>
                  <Link href="/tournaments" className={styles.tournamentsButton}>
                    Register to Tournaments
                  </Link>
                </div>

                {matches.length > 0 ? (
                  <div className={styles.matchesList}>
                    {matches.map((m: any) => (
                      <MatchCard key={m._id} match={m} sport={m?.sportId?.name || "Tennis"} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No matches yet. Start competing to see your activity here.</div>
                )}
              </section>
            )}

            {activeSection === "sports-levels" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>My Sports & Levels</h1>

                <div className={styles.sportsGrid}>
                  <div className={styles.infoCardLarge}>
                    <h3 className={styles.cardTitle}>Sports Leaderboard Overview</h3>
                    {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                      leaderboard.slice(0, 5).map((p: any, i: number) => (
                        <div key={p._id || i} className={styles.rowLine}>
                          <span>#{i + 1} {p?.userId?.name || p?.name || "Player"}</span>
                          <span>{p?.currentRating ?? "-"}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.noteText}>No leaderboard data yet.</p>
                    )}
                  </div>

                  <div className={styles.infoCardLarge}>
                    <h3 className={styles.cardTitle}>Rating History</h3>
                    {Array.isArray(ratings) && ratings.length > 0 ? (
                      ratings.map((r: any) => (
                        <div key={r._id} className={styles.rowLine}>
                          <span>{r?.sportId?.name || "Sport"}</span>
                          <span>{r?.currentRating ?? "-"}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.noteText}>No ratings available yet.</p>
                    )}
                  </div>

                  <div className={styles.infoCardLarge}>
                    <h3 className={styles.cardTitle}>Tournaments Available Nearby</h3>
                    <div className={styles.rowLine}><span>City Cup Open</span><span>This Weekend</span></div>
                    <div className={styles.rowLine}><span>Regional Doubles</span><span>Next Week</span></div>
                    <div className={styles.rowLine}><span>Community Masters</span><span>In 2 Weeks</span></div>
                  </div>

                  <div className={styles.noteCard}>
                    <h3 className={styles.noteTitle}>More To Come</h3>
                    <p className={styles.noteText}>More to come in the future ...</p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "settings" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>Settings</h1>
                <div className={styles.settingsList}>
                  <button type="button" className={styles.settingsButton}>Change Password</button>
                  <button type="button" className={styles.settingsButton}>Edit Profile</button>
                </div>
                <p className={styles.noteText}>More to come in the future ...</p>
              </section>
            )}

            {activeSection === "privacy" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>Privacy</h1>
                <p className={styles.noteText}>More to come in the future ...</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
