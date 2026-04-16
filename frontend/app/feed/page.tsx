"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import FeedSidebar from "@/components/layout/FeedSidebar";
import styles from "./page.module.css";

type FeedMode = "for-you" | "following" | "nearby";
type ContentFilter = "all" | "posts" | "matches";
type FeedSection = "feed" | "trending" | "my-sports" | "my-communities";
type SportFilter = "all" | "Tennis" | "Soccer" | "Padel" | "Pickleball";
type ComposerSportTag = Exclude<SportFilter, "all">;

type ApiAuthor = {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
};

type ApiPostCommunity = {
  _id: string;
  name?: string;
};

type ApiFeedPost = {
  _id: string;
  text: string;
  sportTag: ComposerSportTag;
  location?: string;
  isMatchResult?: boolean;
  hasMedia?: boolean;
  hasLocation?: boolean;
  author?: ApiAuthor;
  community?: ApiPostCommunity | string | null;
  createdAt: string;
};

type ApiCommunity = {
  _id: string;
  name: string;
  createdBy?: ApiAuthor;
  memberCount: number;
  isMember: boolean;
  createdAt: string;
};

type UserMeResponse = {
  user?: { _id?: string };
  ratings?: Array<{ sportId?: { name?: string } }>;
  followingIds?: string[];
};

const API_BASE = "http://localhost:8080";
const FUTURE_FEATURE_TEXT = "Feature available in the near future.";

const SECTION_INTRO: Record<FeedSection, { title: string; subtitle: string; pill: string }> = {
  feed: {
    title: "Your Feed",
    subtitle: "Real posts from RyadaZone users in one stream.",
    pill: "Live feed",
  },
  trending: {
    title: "Trending",
    subtitle: "Topic-level insights and ranked discussions are coming next.",
    pill: "Upcoming",
  },
  "my-sports": {
    title: "My Sports",
    subtitle: "Posts filtered by your sport profile.",
    pill: "Personalized",
  },
  "my-communities": {
    title: "My Communities",
    subtitle: "Post inside your communities and follow each room feed.",
    pill: "Community feed",
  },
};

function normalizeSection(section: string | null): FeedSection {
  if (section === "trending" || section === "my-sports" || section === "my-communities") {
    return section;
  }
  return "feed";
}

function getAuthorName(author?: ApiAuthor) {
  if (!author) return "Unknown User";
  const full = `${author.firstName || ""} ${author.lastName || ""}`.trim();
  return full || author.name || author.email || "Unknown User";
}

function formatRelativeTime(dateString: string) {
  const created = new Date(dateString).getTime();
  if (Number.isNaN(created)) return "Just now";

  const diffMs = Date.now() - created;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function isOwnedByUser(post: ApiFeedPost, userId: string | null) {
  if (!userId) return false;
  return String(post.author?._id || "") === String(userId);
}

function getPostCommunityId(post: ApiFeedPost) {
  const community = post.community;
  if (!community) return "";
  if (typeof community === "string") return String(community);
  return String(community._id || "");
}

function getPostCommunityName(post: ApiFeedPost) {
  const community = post.community;
  if (!community || typeof community === "string") return "";
  return String(community.name || "").trim();
}

function FutureFeatureCard({ title }: { title: string }) {
  return (
    <article className={styles.futureCard}>
      <h4 className={styles.futureTitle}>{title}</h4>
      <p className={styles.futureText}>{FUTURE_FEATURE_TEXT}</p>
    </article>
  );
}

export default function FeedPage() {
  const searchParams = useSearchParams();
  const section = normalizeSection(searchParams.get("section"));

  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");

  const [composerText, setComposerText] = useState("");
  const [composerSportTag, setComposerSportTag] = useState<ComposerSportTag>("Tennis");
  const [composerLocation, setComposerLocation] = useState("");
  const [matchResultFlag, setMatchResultFlag] = useState(false);
  const [mediaFlag, setMediaFlag] = useState(false);
  const [locationFlag, setLocationFlag] = useState(false);
  const [composerMessage, setComposerMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [posts, setPosts] = useState<ApiFeedPost[]>([]);
  const [userSports, setUserSports] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);

  const [communities, setCommunities] = useState<ApiCommunity[]>([]);
  const [communityName, setCommunityName] = useState("");
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
  const [communityMessage, setCommunityMessage] = useState("");
  const [composerCommunityId, setComposerCommunityId] = useState("");

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSportTag, setEditSportTag] = useState<ComposerSportTag>("Tennis");
  const [editLocation, setEditLocation] = useState("");
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    const cookieToken = Cookies.get("token");
    const resolvedToken = localToken || cookieToken || null;

    if (resolvedToken && !localToken) {
      localStorage.setItem("token", resolvedToken);
    }

    setToken(resolvedToken);

    const load = async () => {
      try {
        setFeedError("");
        setIsInitialLoading(true);

        const postsRes = await fetch(`${API_BASE}/api/feed/posts`, {
          headers: resolvedToken
            ? {
                Authorization: `Bearer ${resolvedToken}`,
              }
            : undefined,
        });
        if (!postsRes.ok) throw new Error("Failed to load feed.");
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);

        if (resolvedToken) {
          const meRes = await fetch(`${API_BASE}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${resolvedToken}`,
            },
          });

          if (meRes.ok) {
            const meData: UserMeResponse = await meRes.json();
            setCurrentUserId(meData?.user?._id || null);
            setFollowingIds(Array.isArray(meData?.followingIds) ? meData.followingIds : []);
            const sports =
              Array.isArray(meData?.ratings)
                ? meData.ratings
                    .map((rating) => rating?.sportId?.name)
                    .filter((sport): sport is string => Boolean(sport))
                : [];
            setUserSports(Array.from(new Set(sports)));
          } else {
            setCurrentUserId(null);
            setFollowingIds([]);
            setUserSports([]);
          }

          const communitiesRes = await fetch(`${API_BASE}/api/communities`, {
            headers: {
              Authorization: `Bearer ${resolvedToken}`,
            },
          });

          if (communitiesRes.ok) {
            const communitiesData = await communitiesRes.json();
            setCommunities(Array.isArray(communitiesData) ? communitiesData : []);
          } else {
            setCommunities([]);
          }
        } else {
          setCurrentUserId(null);
          setFollowingIds([]);
          setCommunities([]);
          setUserSports([]);
        }
      } catch (error) {
        setFeedError("Unable to load feed at the moment.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    load();
  }, []);

  const showFutureModeCard = feedMode === "following" || feedMode === "nearby";
  const showFutureSectionCard = section === "trending";
  const showFutureFilterCard = contentFilter === "matches";
  const isCommunitySection = section === "my-communities";
  const myCommunities = useMemo(() => communities.filter((community) => community.isMember), [communities]);
  const myCommunityIds = useMemo(() => new Set(myCommunities.map((community) => String(community._id))), [myCommunities]);
  const selectedComposerCommunity = useMemo(
    () => myCommunities.find((community) => community._id === composerCommunityId) || null,
    [myCommunities, composerCommunityId]
  );

  useEffect(() => {
    if (!isCommunitySection) return;
    if (myCommunities.length === 0) {
      if (composerCommunityId) setComposerCommunityId("");
      return;
    }

    const hasSelectedCommunity = myCommunities.some((community) => community._id === composerCommunityId);
    if (!hasSelectedCommunity) {
      setComposerCommunityId(myCommunities[0]._id);
    }
  }, [isCommunitySection, myCommunities, composerCommunityId]);

  const visiblePosts = useMemo(() => {
    if (showFutureSectionCard || showFutureFilterCard) return [];

    let list = [...posts];

    if (section === "my-sports") {
      if (userSports.length === 0) return [];
      list = list.filter((post) => userSports.includes(post.sportTag));
    }

    if (section === "my-communities") {
      if (myCommunities.length === 0) return [];

      list = list.filter((post) => myCommunityIds.has(getPostCommunityId(post)));

      if (composerCommunityId) {
        list = list.filter((post) => getPostCommunityId(post) === composerCommunityId);
      }
    }

    if (sportFilter !== "all") {
      list = list.filter((post) => post.sportTag === sportFilter);
    }

    return list;
  }, [posts, section, userSports, sportFilter, showFutureSectionCard, showFutureFilterCard, myCommunities, myCommunityIds, composerCommunityId]);

  const handleCreatePost = async () => {
    const cleanText = composerText.trim();
    if (!cleanText) {
      setComposerMessage("Write a quick update before posting.");
      return;
    }

    if (!token) {
      setComposerMessage("Login required to publish a post.");
      return;
    }

    if (isCommunitySection && myCommunities.length === 0) {
      setComposerMessage("Join or create a community before posting here.");
      return;
    }

    if (isCommunitySection && !composerCommunityId) {
      setComposerMessage("Choose a community before publishing.");
      return;
    }

    try {
      setIsPosting(true);
      setComposerMessage("");

      const res = await fetch(`${API_BASE}/api/feed/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: cleanText,
          sportTag: composerSportTag,
          location: composerLocation.trim(),
          isMatchResult: matchResultFlag,
          hasMedia: mediaFlag,
          hasLocation: locationFlag,
          communityId: isCommunitySection ? composerCommunityId : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to publish post (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      setPosts((prev) => [data as ApiFeedPost, ...prev]);
      setComposerText("");
      setComposerLocation("");
      setMatchResultFlag(false);
      setMediaFlag(false);
      setLocationFlag(false);
      setComposerMessage(
        isCommunitySection && selectedComposerCommunity ? `Post published in ${selectedComposerCommunity.name}.` : "Post published."
      );
    } catch (error: any) {
      setComposerMessage(error?.message || "Failed to publish post.");
    } finally {
      setIsPosting(false);
    }
  };

  const startEditingPost = (post: ApiFeedPost) => {
    setEditingPostId(post._id);
    setEditText(post.text);
    setEditSportTag(post.sportTag);
    setEditLocation(post.location || "");
    setComposerMessage("");
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditText("");
    setEditSportTag("Tennis");
    setEditLocation("");
  };

  const handleSavePostEdit = async (postId: string) => {
    const cleanText = editText.trim();
    if (!cleanText) {
      setComposerMessage("Post text cannot be empty.");
      return;
    }

    if (!token) {
      setComposerMessage("Login required to modify post.");
      return;
    }

    try {
      setUpdatingPostId(postId);

      const res = await fetch(`${API_BASE}/api/feed/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: cleanText,
          sportTag: editSportTag,
          location: editLocation.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to update post (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      setPosts((prev) => prev.map((post) => (post._id === postId ? (data as ApiFeedPost) : post)));
      cancelEditingPost();
      setComposerMessage("Post updated.");
    } catch (error: any) {
      setComposerMessage(error?.message || "Failed to update post.");
    } finally {
      setUpdatingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!token) {
      setComposerMessage("Login required to delete post.");
      return;
    }

    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    try {
      setDeletingPostId(postId);

      const res = await fetch(`${API_BASE}/api/feed/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to delete post (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      setPosts((prev) => prev.filter((post) => post._id !== postId));
      if (editingPostId === postId) {
        cancelEditingPost();
      }
      setComposerMessage("Post deleted.");
    } catch (error: any) {
      setComposerMessage(error?.message || "Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!token) {
      setComposerMessage("Login required to follow users.");
      return;
    }

    if (!targetUserId || String(targetUserId) === String(currentUserId)) return;

    try {
      setFollowBusyUserId(targetUserId);

      const res = await fetch(`${API_BASE}/api/users/${targetUserId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to update follow (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      setFollowingIds((prev) => {
        const has = prev.includes(targetUserId);
        const shouldFollow = Boolean((data as { following?: boolean })?.following);

        if (shouldFollow && !has) return [...prev, targetUserId];
        if (!shouldFollow && has) return prev.filter((id) => id !== targetUserId);
        return prev;
      });
    } catch (error: any) {
      setComposerMessage(error?.message || "Failed to update follow.");
    } finally {
      setFollowBusyUserId(null);
    }
  };

  const handleCreateCommunity = async () => {
    const cleanName = communityName.trim();
    if (!cleanName) {
      setCommunityMessage("Community name is required.");
      return;
    }

    if (!token) {
      setCommunityMessage("Login required to create community.");
      return;
    }

    try {
      setIsCreatingCommunity(true);
      setCommunityMessage("");

      const res = await fetch(`${API_BASE}/api/communities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to create community (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      const created = data as ApiCommunity;
      setCommunities((prev) => [created, ...prev.filter((community) => community._id !== created._id)]);
      setComposerCommunityId(created._id);
      setCommunityName("");
      setCommunityMessage("Community created. You are now a member.");
    } catch (error: any) {
      setCommunityMessage(error?.message || "Failed to create community.");
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!token) {
      setCommunityMessage("Login required to join communities.");
      return;
    }

    try {
      setJoiningCommunityId(communityId);
      setCommunityMessage("");

      const res = await fetch(`${API_BASE}/api/communities/${communityId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = `Failed to join community (HTTP ${res.status}).`;
        throw new Error((data && typeof data === "object" && "message" in data ? (data as { message?: string }).message : null) || fallbackMessage);
      }

      const updated = data as ApiCommunity;
      setCommunities((prev) => prev.map((community) => (community._id === communityId ? updated : community)));
      setComposerCommunityId(updated._id);
      setCommunityMessage("Joined community successfully.");
    } catch (error: any) {
      setCommunityMessage(error?.message || "Failed to join community.");
    } finally {
      setJoiningCommunityId(null);
    }
  };

  const feedCountLabel = visiblePosts.length === 1 ? "1 live post" : `${visiblePosts.length} live posts`;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <FeedSidebar />

        <main className={styles.main}>
          <div className={styles.mainInner}>
            <section className={styles.heroCard}>
              <div>
                <p className={styles.heroPill}>{SECTION_INTRO[section].pill}</p>
                <h1 className={styles.heroTitle}>{SECTION_INTRO[section].title}</h1>
                <p className={styles.heroSubtitle}>{SECTION_INTRO[section].subtitle}</p>
              </div>

              <div className={styles.gamificationCard}>
                <p className={styles.gamificationLabel}>Feed Status</p>
                <p className={styles.gamificationValue}>{feedCountLabel}</p>
                <p className={styles.gamificationMeta}>Posts are now persisted across user sessions.</p>
              </div>
            </section>

            <section className={styles.feedHeader}>
              <div className={styles.feedHeaderTop}>
                <h2 className={styles.feedHeading}>Your Feed</h2>
                <p className={styles.feedMeta}>{feedCountLabel}</p>
              </div>

              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${feedMode === "for-you" ? styles.modeButtonActive : ""}`}
                  onClick={() => setFeedMode("for-you")}
                >
                  For You
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${feedMode === "following" ? styles.modeButtonActive : ""}`}
                  onClick={() => setFeedMode("following")}
                >
                  Following
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${feedMode === "nearby" ? styles.modeButtonActive : ""}`}
                  onClick={() => setFeedMode("nearby")}
                >
                  Nearby
                </button>
              </div>

              <div className={styles.filterRow}>
                <label className={styles.filterLabel}>
                  Content
                  <select
                    className={styles.selectControl}
                    value={contentFilter}
                    onChange={(event) => setContentFilter(event.target.value as ContentFilter)}
                  >
                    <option value="all">All content</option>
                    <option value="posts">Only posts</option>
                    <option value="matches">Only matches</option>
                  </select>
                </label>

                <label className={styles.filterLabel}>
                  Sport
                  <select
                    className={styles.selectControl}
                    value={sportFilter}
                    onChange={(event) => setSportFilter(event.target.value as SportFilter)}
                  >
                    <option value="all">All sports</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Padel">Padel</option>
                    <option value="Pickleball">Pickleball</option>
                  </select>
                </label>
              </div>
            </section>

            <section id="create-post" className={styles.composerCard}>
              <h3 className={styles.composerTitle}>What&apos;s happening in your game today?</h3>
              <textarea
                className={styles.composerInput}
                placeholder="Share progress, post a result, or ask for an opponent..."
                value={composerText}
                onChange={(event) => {
                  setComposerText(event.target.value);
                  setComposerMessage("");
                }}
              />

              <div className={styles.composerTools}>
                <button
                  type="button"
                  className={`${styles.toolButton} ${matchResultFlag ? styles.toolButtonActive : ""}`}
                  onClick={() => setMatchResultFlag((prev) => !prev)}
                >
                  Add match result
                </button>
                <button
                  type="button"
                  className={`${styles.toolButton} ${mediaFlag ? styles.toolButtonActive : ""}`}
                  onClick={() => setMediaFlag((prev) => !prev)}
                >
                  Add image/video
                </button>
                <button
                  type="button"
                  className={`${styles.toolButton} ${locationFlag ? styles.toolButtonActive : ""}`}
                  onClick={() => setLocationFlag((prev) => !prev)}
                >
                  Add location
                </button>
                <label className={styles.tagSelectWrap}>
                  Sport tag
                  <select
                    className={styles.tagSelect}
                    value={composerSportTag}
                    onChange={(event) => setComposerSportTag(event.target.value as ComposerSportTag)}
                  >
                    <option value="Tennis">#Tennis</option>
                    <option value="Soccer">#Soccer</option>
                    <option value="Padel">#Padel</option>
                    <option value="Pickleball">#Pickleball</option>
                  </select>
                </label>
                {isCommunitySection && (
                  <label className={styles.communitySelectWrap}>
                    Community
                    <select
                      className={styles.communitySelect}
                      value={composerCommunityId}
                      onChange={(event) => setComposerCommunityId(event.target.value)}
                      disabled={myCommunities.length === 0}
                    >
                      {myCommunities.length === 0 ? (
                        <option value="">Join a community first</option>
                      ) : (
                        myCommunities.map((community) => (
                          <option key={community._id} value={community._id}>
                            {community.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                )}
              </div>

              {isCommunitySection && myCommunities.length === 0 && (
                <p className={styles.communityPickerHint}>Join or create a community first, then choose where to publish.</p>
              )}

              {locationFlag && (
                <input
                  className={styles.locationInput}
                  placeholder="Location"
                  value={composerLocation}
                  onChange={(event) => setComposerLocation(event.target.value)}
                />
              )}

              <div className={styles.composerActions}>
                <button
                  type="button"
                  className={styles.publishButton}
                  onClick={handleCreatePost}
                  disabled={isPosting}
                >
                  {isPosting ? "Posting..." : "Post Update"}
                </button>
              </div>

              {composerMessage && <p className={styles.composerMessage}>{composerMessage}</p>}
            </section>

            {isCommunitySection && (
              <section className={styles.communitySectionCard}>
                <h3 className={styles.communitySectionTitle}>My Communities</h3>
                <p className={styles.communitySectionSubtitle}>Create or join communities. Membership is automatic when created or joined.</p>

                <div className={styles.communityCreateRow}>
                  <input
                    className={styles.communityInput}
                    placeholder="Community name"
                    value={communityName}
                    onChange={(event) => setCommunityName(event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.communityCreateButton}
                    onClick={handleCreateCommunity}
                    disabled={isCreatingCommunity}
                  >
                    {isCreatingCommunity ? "Creating..." : "Create Community"}
                  </button>
                </div>

                {communityMessage && <p className={styles.communityMessage}>{communityMessage}</p>}

                <div className={styles.communityList}>
                  {communities.length === 0 && (
                    <div className={styles.communityEmpty}>No communities yet. Create the first one.</div>
                  )}

                  {communities.map((community) => (
                    <article key={community._id} className={styles.communityCard}>
                      <div>
                        <p className={styles.communityName}>{community.name}</p>
                        <p className={styles.communityMeta}>
                          {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={community.isMember ? styles.communityJoinedButton : styles.communityJoinButton}
                        onClick={() => handleJoinCommunity(community._id)}
                        disabled={community.isMember || joiningCommunityId === community._id}
                      >
                        {community.isMember ? "Member" : joiningCommunityId === community._id ? "Joining..." : "Join"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {showFutureModeCard && <FutureFeatureCard title={`${feedMode === "following" ? "Following" : "Nearby"} Feed`} />}
            {showFutureSectionCard && <FutureFeatureCard title="Trending Feed" />}
            {showFutureFilterCard && <FutureFeatureCard title="Match-Only Feed Filter" />}

            {isInitialLoading ? (
              <section className={styles.feedStream}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className={styles.skeletonCard}>
                    <div className={styles.skeletonLineWide} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                  </div>
                ))}
              </section>
            ) : (
              <section className={styles.feedStream}>
                {feedError && (
                  <article className={styles.emptyStateCard}>
                    <h3>Feed unavailable</h3>
                    <p>{feedError}</p>
                  </article>
                )}

                {!feedError && visiblePosts.length === 0 && (
                  <article className={styles.emptyStateCard}>
                    <h3>No posts yet</h3>
                    <p>
                      {isCommunitySection
                        ? "No posts found for this community yet. Publish the first one."
                        : "Create the first post for this view."}
                    </p>
                  </article>
                )}

                {visiblePosts.map((post) => {
                  const isOwner = isOwnedByUser(post, currentUserId);
                  const isEditing = editingPostId === post._id;
                  const isUpdating = updatingPostId === post._id;
                  const isDeleting = deletingPostId === post._id;
                  const authorId = post.author?._id || "";
                  const isFollowingAuthor = authorId ? followingIds.includes(authorId) : false;
                  const isFollowBusy = followBusyUserId === authorId;
                  const communityId = getPostCommunityId(post);
                  const communityName = getPostCommunityName(post);

                  return (
                    <article key={post._id} className={`${styles.feedCard} ${styles.reveal}`}>
                      <div className={styles.cardTop}>
                        <div>
                          <p className={`${styles.authorLine} ${isOwner ? styles.ownerAuthorGlow : ""}`}>
                            {getAuthorName(post.author)}
                            <span className={styles.ratingTag}>#{post.sportTag}</span>
                          </p>
                          <p className={styles.metaLine}>
                            {formatRelativeTime(post.createdAt)}
                            {communityName ? ` • ${communityName}` : ""}
                            {post.location ? ` • ${post.location}` : ""}
                            {post.author?.email ? ` • ${post.author.email}` : ""}
                          </p>
                        </div>
                        <span className={styles.postTag}>{communityId ? "Community Post" : isOwner ? "Your Post" : "Post"}</span>
                      </div>

                      {isEditing ? (
                        <div className={styles.inlineEditWrap}>
                          <textarea
                            className={styles.inlineEditTextarea}
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                          />
                          <div className={styles.inlineEditControls}>
                            <label className={styles.filterLabel}>
                              Sport tag
                              <select
                                className={styles.selectControl}
                                value={editSportTag}
                                onChange={(event) => setEditSportTag(event.target.value as ComposerSportTag)}
                              >
                                <option value="Tennis">Tennis</option>
                                <option value="Soccer">Soccer</option>
                                <option value="Padel">Padel</option>
                                <option value="Pickleball">Pickleball</option>
                              </select>
                            </label>
                            <input
                              className={styles.locationInput}
                              placeholder="Location"
                              value={editLocation}
                              onChange={(event) => setEditLocation(event.target.value)}
                            />
                          </div>
                          <div className={styles.ownerActions}>
                            <button
                              type="button"
                              className={styles.ownerEditButton}
                              onClick={() => handleSavePostEdit(post._id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              className={styles.ownerCancelButton}
                              onClick={cancelEditingPost}
                              disabled={isUpdating}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.postBody}>{post.text}</p>
                      )}

                      {!isEditing && (
                        <div className={styles.postExtras}>
                          {communityName && <span className={styles.communityPill}>{communityName}</span>}
                          {post.isMatchResult && <span className={styles.pill}>Match Result</span>}
                          {post.hasMedia && <span className={styles.pillMuted}>Media</span>}
                          {post.hasLocation && <span className={styles.pillMuted}>Location</span>}
                        </div>
                      )}

                      <div className={styles.cardActions}>
                        <button type="button" className={styles.actionButton}>
                          Like
                        </button>
                        <button type="button" className={styles.actionButton}>
                          Comment
                        </button>
                        <button type="button" className={styles.actionButton}>
                          Share
                        </button>
                        {!isOwner && Boolean(authorId) && (
                          <button
                            type="button"
                            className={isFollowingAuthor ? styles.followingButton : styles.followButton}
                            onClick={() => handleToggleFollow(authorId)}
                            disabled={isFollowBusy}
                          >
                            {isFollowBusy ? "..." : isFollowingAuthor ? "Following" : "Follow"}
                          </button>
                        )}
                        <button type="button" className={styles.challengeButton}>
                          Challenge
                        </button>
                      </div>

                      {isOwner && !isEditing && (
                        <div className={styles.ownerActions}>
                          <button
                            type="button"
                            className={styles.ownerEditButton}
                            onClick={() => startEditingPost(post)}
                            disabled={isDeleting}
                          >
                            Modify
                          </button>
                          <button
                            type="button"
                            className={styles.ownerDeleteButton}
                            onClick={() => handleDeletePost(post._id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </main>

        <aside className={styles.rightRail}>
          <div className={styles.rightRailInner}>
            <section className={styles.railCard}>
              <div className={styles.railHeader}>
                <h3>Live Now</h3>
                <span className={styles.liveDot} />
              </div>
              <FutureFeatureCard title="Live Match Streaming" />
            </section>

            <section className={styles.railCard}>
              <div className={styles.railHeader}>
                <h3>Recommended Players</h3>
              </div>
              <FutureFeatureCard title="Smart Player Recommendations" />
            </section>

            <section className={styles.railCard}>
              <div className={styles.railHeader}>
                <h3>Trending Topics</h3>
              </div>
              <FutureFeatureCard title="Topic Discovery" />
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
