"use client";

import { disciplines } from "@/lib/sports";
import { isTeamSport } from "@/lib/sports";
import Link from "next/link";
import { SportPanel } from "@/components/RatingPanels";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import MatchCard from "@/components/cards/cards";
import { useAuthGuard } from "@/lib/withAuth";
import { API_URL } from "@/lib/api";
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
type ProfileForm = {
  name: string;
  nationality: string;
  city: string;
  dateOfBirth: string;
  height: string;
  weight: string;
  favoritePlayer: string;
};
export default function ProfilePage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");

  const [activeSection, setActiveSection] =
    useState<ProfileSection>("overview");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null,
  );
  const [selectedImageName, setSelectedImageName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedSportId, setSelectedSportId] = useState("");
  const [isAddingSport, setIsAddingSport] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    nationality: "",
    city: "",
    dateOfBirth: "",
    height: "",
    weight: "",
    favoritePlayer: "",
  });

  const [data, setData] = useState<any>({
    user: null,
    recentMatches: [],
    upcomingMatches: [],
    ratings: [],
    ratingHistory: [],
    sportsCatalog: [],
    leaderboards: {},
  });

  useEffect(() => {
    const safeFetch = async (url: string, token?: string) => {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      let result: any;
      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        result = null;
      }

      if (!res.ok || !contentType?.includes("application/json")) {
        console.error("Profile API error", {
          url,
          status: res.status,
          contentType,
          response: responseText,
        });
        throw new Error(
          result?.message ||
            (res.status === 404
              ? `Backend route not found (${res.status}): ${url}. Restart the backend server.`
              : `Request failed (${res.status}) for ${url}`),
        );
      }

      return result;
    };

    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setApiError("You must be logged in to load your profile.");
        setIsLoadingProfile(false);
        return;
      }

      try {
        const userJson = await safeFetch(`${API_URL}/api/users/me`, token);

        const userBase = userJson?.user || userJson || null;
        const userRatings = Array.isArray(userJson?.ratings)
          ? userJson.ratings.filter((r: any) => !isTeamSport(r.sportId?.name))
          : [];
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

        setData((previous: any) => ({
          ...previous,
          user: userBase
            ? {
                ...userBase,
                followersCount,
                followingCount,
              }
            : null,
          ratings: userRatings,
          recentMatches: Array.isArray(userJson?.recentMatches)
            ? userJson.recentMatches
            : [],
          upcomingMatches: Array.isArray(userJson?.upcomingMatches)
            ? userJson.upcomingMatches
            : [],
          ratingHistory: Array.isArray(userJson?.ratingHistory)
            ? userJson.ratingHistory
            : [],
        }));
        setIsLoadingProfile(false);

        const [sportsResult, ...leaderboardResults] = await Promise.allSettled([
          safeFetch(`${API_URL}/api/sports`),
          ...userRatings
            .filter((rating: any) => rating?.sportId?._id)
            .map((rating: any) =>
              safeFetch(
                `${API_URL}/api/leaderboard/${rating.sportId._id}?discipline=${encodeURIComponent(rating.discipline || "singles")}`,
              ),
            ),
        ]);
        const leaderboards: Record<string, any[]> = {};
        userRatings
          .filter((rating: any) => rating?.sportId?._id)
          .forEach((rating: any, index: number) => {
            const result = leaderboardResults[index];
            if (result.status === "fulfilled") {
              leaderboards[
                `${rating.sportId._id}:${rating.discipline || "singles"}`
              ] = Array.isArray(result.value) ? result.value : [];
            }
          });
        setData((previous: any) => ({
          ...previous,
          sportsCatalog:
            sportsResult.status === "fulfilled" &&
            Array.isArray(sportsResult.value)
              ? sportsResult.value
              : [],
          leaderboards,
        }));
        if (sportsResult.status === "rejected") {
          setApiError(
            sportsResult.reason instanceof Error
              ? sportsResult.reason.message
              : "Could not load the list of sports.",
          );
        }
      } catch (err) {
        console.error("Profile page fetch error", err);
        setApiError(
          err instanceof Error ? err.message : "Unable to load profile data.",
        );
      } finally {
        setIsLoadingProfile(false);
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

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const {
    user,
    recentMatches,
    upcomingMatches,
    ratings,
    ratingHistory,
    sportsCatalog,
    leaderboards,
  } = data;
  const matches = [...(upcomingMatches || []), ...(recentMatches || [])];

  const handleAddSport = async () => {
    if (!selectedSportId || isAddingSport) return;

    setIsAddingSport(true);
    setApiError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in.");

      const response = await fetch(`${API_URL}/api/users/me/sports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sportId: selectedSportId,
          discipline: selectedDiscipline,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to add this sport.");
      }

      setData((previous: any) => ({
        ...previous,
        ratings: previous.ratings.some(
          (rating: any) =>
            rating.sportId?._id === selectedSportId &&
            (rating.discipline || "singles") === selectedDiscipline,
        )
          ? previous.ratings
          : [...previous.ratings, result],
      }));
      setSelectedSportId("");

      const leaderboardResponse = await fetch(
        `${API_URL}/api/leaderboard/${selectedSportId}?discipline=${encodeURIComponent(selectedDiscipline)}`,
      );
      if (!leaderboardResponse.ok) {
        throw new Error(
          "Sport was added, but its leaderboard could not be refreshed.",
        );
      }
      const rows = await leaderboardResponse.json();
      setData((previous: any) => ({
        ...previous,
        leaderboards: {
          ...previous.leaderboards,
          [`${selectedSportId}:${selectedDiscipline}`]: Array.isArray(rows)
            ? rows
            : [],
        },
      }));
    } catch (error) {
      console.error("Add profile sport error:", error);
      setApiError(
        error instanceof Error ? error.message : "Unable to add this sport.",
      );
    } finally {
      setIsAddingSport(false);
    }
  };

  const accountTypeRaw =
    user?.accountType || user?.role || (user?.isAthlete ? "Athlete" : "Fan");
  const accountType =
    typeof accountTypeRaw === "string"
      ? accountTypeRaw
      : accountTypeRaw
        ? String(accountTypeRaw)
        : "Fan";
  const isAthlete = accountType.toLowerCase().includes("athlete");

  const sportsPlayed = useMemo(() => {
    const fromProfile = Array.isArray(user?.sports)
      ? user.sports
          .map(
            (sport: any) =>
              sport?.name ||
              sport?.sportId?.name ||
              sport?.sport?.name ||
              sport,
          )
          .filter(Boolean)
      : [];

    const fromRatings = Array.isArray(ratings)
      ? ratings
          .map((r: any) => r?.sportId?.name || r?.sport?.name)
          .filter(Boolean)
      : [];

    return Array.from(new Set([...fromProfile, ...fromRatings])) as string[];
  }, [ratings, user?.sports]);

  const profilePicture =
    profileImagePreview || user?.profilePicture || user?.avatarUrl || null;

  const overviewFields = [
    { label: "User Type", value: accountType || "Not set" },
    { label: "Followers", value: String(user?.followersCount ?? 0) },
    { label: "Following", value: String(user?.followingCount ?? 0) },
    {
      label: "Age",
      value: getAge(user?.age || user?.dateOfBirth || user?.dob),
    },
    { label: "Nationality", value: user?.nationality || "Not set" },
    { label: "City", value: user?.city || user?.location?.city || "Not set" },
    { label: "Height", value: user?.height ? `${user.height} cm` : "Not set" },
    { label: "Weight", value: user?.weight ? `${user.weight} kg` : "Not set" },
    { label: "Favorite Player", value: user?.favoritePlayer || "Not set" },
  ];

  const handleEditProfile = () => {
    if (!user) {
      setSaveMessage(
        isLoadingProfile
          ? "Your profile is still loading. Please try again shortly."
          : "Your profile could not be loaded. Refresh the page and try again.",
      );
      setActiveSection("settings");
      return;
    }

    setProfileForm({
      name: user.name || "",
      nationality: user.nationality || "",
      city: user.city || user.location?.city || "",
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      height: user.height?.toString() || "",
      weight: user.weight?.toString() || "",
      favoritePlayer: user.favoritePlayer || "",
    });

    setSaveMessage("");
    setIsEditing(true);
    setActiveSection("settings");
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("You must be logged in.");
      }

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name: profileForm.name,
          nationality: profileForm.nationality,
          city: profileForm.city,

          dateOfBirth: profileForm.dateOfBirth || null,

          height: profileForm.height === "" ? null : Number(profileForm.height),

          weight: profileForm.weight === "" ? null : Number(profileForm.weight),

          favoritePlayer: profileForm.favoritePlayer,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile.");
      }

      // Update the profile displayed on the page.
      setData((previous: any) => ({
        ...previous,

        user: {
          ...previous.user,
          ...result.user,
        },
      }));

      setIsEditing(false);
      setSaveMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);

      setSaveMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
            {apiError && (
              <p className={styles.errorMessage} role="alert">
                {apiError}
              </p>
            )}

            {activeSection === "overview" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>Overview</h1>

                <div className={styles.overviewTop}>
                  <div className={styles.profilePictureBlock}>
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className={styles.profilePicture}
                      />
                    ) : (
                      <div className={styles.profileFallback}>
                        {(user?.name || user?.email || "U")[0]?.toUpperCase()}
                      </div>
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

                    {selectedImageName && (
                      <p className={styles.uploadInfo}>
                        Selected: {selectedImageName}
                      </p>
                    )}
                  </div>

                  <div className={styles.identityBlock}>
                    <h2 className={styles.playerName}>
                      {user?.name || "Player"}
                    </h2>
                    <p className={styles.playerMeta}>
                      {user?.email || "No email set"}
                    </p>
                    <p className={styles.playerMeta}>
                      {user?.followersCount ?? 0} Followers •{" "}
                      {user?.followingCount ?? 0} Following
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
                      <p className={styles.noteText}>
                        {sportsPlayed.join(" • ")}
                      </p>
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
                  <Link href="/compete" className={styles.tournamentsButton}>
                    Find a Match
                  </Link>
                </div>

                {matches.length > 0 ? (
                  <div className={styles.matchesList}>
                    {matches.map((m: any) => (
                      <MatchCard
                        key={m._id}
                        match={m}
                        sport={m?.sport?.name || "Sport"}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    No matches yet. Start competing to see your activity here.
                  </div>
                )}
              </section>
            )}

            {activeSection === "sports-levels" && (
              <section className={styles.sectionCard}>
                <Link
                  href="/compete?section=teams"
                  className={styles.soccerLink}
                >
                  Team sports: manage your squads, memberships and player
                  profile →
                </Link>
                <SportPanel
                  user={user}
                  ratings={ratings}
                  history={ratingHistory}
                  leaderboards={leaderboards}
                  recentMatches={recentMatches}
                  picture={profilePicture}
                  onEdit={handleEditProfile}
                />
                <details className={styles.addSportDisclosure}>
                  <summary>Add a sport</summary>
                  <div className={styles.settingsList}>
                    <label
                      className={styles.sportPickerLabel}
                      htmlFor="profile-sport"
                    >
                      Add a sport
                    </label>
                    <select
                      id="profile-sport"
                      className={styles.sportPicker}
                      value={selectedSportId}
                      onChange={(event) => {
                        setSelectedSportId(event.target.value);
                        setSelectedDiscipline(
                          disciplines(
                            sportsCatalog.find(
                              (s: any) => s._id === event.target.value,
                            )?.name,
                          )[0]?.id || "",
                        );
                      }}
                    >
                      <option value="">Choose a sport</option>
                      {sportsCatalog
                        .filter((sport: any) => !isTeamSport(sport.name))
                        .map((sport: any) => (
                          <option key={sport._id} value={sport._id}>
                            {sport.name}
                          </option>
                        ))}
                    </select>
                    <label className={styles.sportPickerLabel}>
                      Discipline / event
                      <select
                        aria-label="Add sport discipline"
                        className={styles.sportPicker}
                        value={selectedDiscipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                      >
                        {disciplines(
                          sportsCatalog.find(
                            (s: any) => s._id === selectedSportId,
                          )?.name,
                        ).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={styles.settingsButton}
                      disabled={!selectedSportId || isAddingSport}
                      onClick={handleAddSport}
                    >
                      {isAddingSport ? "Adding..." : "Add Sport"}
                    </button>
                  </div>
                </details>
              </section>
            )}

            {activeSection === "settings" && (
              <section className={styles.sectionCard}>
                <h1 className={styles.sectionTitle}>Settings</h1>

                {!isEditing ? (
                  <div className={styles.settingsList}>
                    <button
                      type="button"
                      className={styles.settingsButton}
                      onClick={handleEditProfile}
                    >
                      Edit Profile
                    </button>

                    <button
                      type="button"
                      className={styles.settingsButton}
                      disabled
                    >
                      Change Password (Coming Soon)
                    </button>
                  </div>
                ) : (
                  <form
                    className={styles.editProfileForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSaveProfile();
                    }}
                  >
                    <h2>Edit Your Profile</h2>

                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label htmlFor="name">Full Name</label>

                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="nationality">Nationality</label>

                        <input
                          id="nationality"
                          type="text"
                          name="nationality"
                          value={profileForm.nationality}
                          onChange={handleProfileChange}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="city">City</label>

                        <input
                          id="city"
                          type="text"
                          name="city"
                          value={profileForm.city}
                          onChange={handleProfileChange}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="dateOfBirth">Date of Birth</label>

                        <input
                          id="dateOfBirth"
                          type="date"
                          name="dateOfBirth"
                          value={profileForm.dateOfBirth}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="height">Height (cm)</label>

                        <input
                          id="height"
                          type="number"
                          name="height"
                          min="1"
                          max="300"
                          value={profileForm.height}
                          onChange={handleProfileChange}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="weight">Weight (kg)</label>

                        <input
                          id="weight"
                          type="number"
                          name="weight"
                          min="1"
                          max="500"
                          step="0.1"
                          value={profileForm.weight}
                          onChange={handleProfileChange}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="favoritePlayer">Favorite Player</label>

                        <input
                          id="favoritePlayer"
                          type="text"
                          name="favoritePlayer"
                          value={profileForm.favoritePlayer}
                          onChange={handleProfileChange}
                        />
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        className={styles.cancelButton}
                        disabled={isSaving}
                        onClick={() => {
                          setIsEditing(false);
                          setSaveMessage("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {saveMessage && (
                  <p role="status" className={styles.noteText}>
                    {saveMessage}
                  </p>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
