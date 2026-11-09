"use client";
import { FormEvent, ReactNode, useState } from "react";
import { API_URL } from "@/lib/api";
import { disciplines, isTeamSport, individualDiscipline } from "@/lib/sports";
import s from "./PostInteractions.module.css";
export async function feedRequest(
  path: string,
  token: string | null,
  body?: any,
  method = "POST",
) {
  const r = await fetch(`${API_URL}/api/feed${path}`, {
    method: body === undefined ? "GET" : method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok)
    throw Error(
      r.status === 404 &&
        String(data.message || "").includes("API route not found")
        ? "This API process is out of date. Run npm run check:api in the repository root and restart the backend."
        : data.message || "Action failed.",
    );
  return data;
}
export default function PostInteractions({
  post,
  userId,
  token,
  onUpdate,
  onChallenge,
  children,
}: {
  post: any;
  userId: string | null;
  token: string | null;
  onUpdate: (stats: any) => void;
  onChallenge: () => void;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [comments, setComments] = useState<any[]>([]),
    [showComments, setShowComments] = useState(false),
    [next, setNext] = useState<string | null>(null),
    [text, setText] = useState(""),
    [shareUrl, setShareUrl] = useState("");
  const [showChallenge, setShowChallenge] = useState(false),
    [teams, setTeams] = useState<any>(null),
    [discipline, setDiscipline] = useState(
      post.discipline || disciplines(post.sportTag)[0]?.id || "",
    );
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function login() {
    if (!token) {
      setError("Log in to interact with this post.");
      return false;
    }
    return true;
  }
  async function loadComments(older = false) {
    const data = await feedRequest(
      `/posts/${post._id}/comments${older && next ? "?before=" + next : ""}`,
      token,
    );
    setComments((prev) =>
      older
        ? [
            ...new Map(
              [...prev, ...data.comments].map((c) => [c._id, c]),
            ).values(),
          ]
        : data.comments,
    );
    setNext(data.nextCursor);
  }
  async function challengePanel() {
    if (!login()) return;
    if (showChallenge) {
      setShowChallenge(false);
      return;
    }
    await run(async () => {
      if (isTeamSport(post.sportTag)) {
        const r = await fetch(
          `${API_URL}/api/team-sports?sport=${encodeURIComponent(post.sportTag)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await r.json();
        if (!r.ok) throw Error(data.message || "Could not load squads.");
        setTeams(data);
      }
      setShowChallenge(true);
    });
  }
  async function share() {
    setError("");
    const url = `${window.location.origin}/feed?post=${encodeURIComponent(post._id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "NajmaSports post", url });
        setNotice("Post link shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice(
          "Post link copied. Community membership is still required for private posts.",
        );
      } else setShareUrl(url);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setShareUrl(url);
      setNotice("Copy the link below to share this post.");
    }
  }
  const author =
    typeof post.author === "object" ? post.author?._id : post.author;
  const own = teams?.squads?.filter((q: any) => q.manager === userId) || [],
    opponents =
      teams?.squads?.filter(
        (q: any) =>
          q.manager !== userId &&
          (q.manager === author ||
            q.members.some(
              (m: any) => m.user === author && m.status === "accepted",
            )),
      ) || [];
  const d = individualDiscipline(post.sportTag, discipline);
  return (
    <section className={s.section} aria-label="Post interactions">
      <div className={s.actions}>
        {(["like", "dislike"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={post.myReaction === kind}
            disabled={busy}
            onClick={() => {
              if (login())
                void run(async () =>
                  onUpdate(
                    await feedRequest(`/posts/${post._id}/reaction`, token, {
                      reaction: post.myReaction === kind ? null : kind,
                    }),
                  ),
                );
            }}
          >
            {kind === "like" ? "Like" : "Dislike"} ·{" "}
            {kind === "like" ? post.likes || 0 : post.dislikes || 0}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={showComments}
          disabled={busy}
          onClick={() => {
            if (showComments) setShowComments(false);
            else
              void run(async () => {
                await loadComments();
                setShowComments(true);
              });
          }}
        >
          Comment · {post.commentCount || 0}
        </button>
        <button type="button" onClick={share}>
          Share
        </button>
        {children}
        {author !== userId && (
          <button
            type="button"
            className={s.primary}
            disabled={busy}
            aria-expanded={showChallenge}
            onClick={challengePanel}
          >
            Challenge
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {shareUrl && (
        <label className={s.label}>
          Post link
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        </label>
      )}
      {showComments && (
        <div className={s.panel}>
          <h4>Comments</h4>
          {token ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const data = await feedRequest(
                    `/posts/${post._id}/comments`,
                    token,
                    { text },
                  );
                  setComments((prev) => [data.comment, ...prev]);
                  onUpdate(data);
                  setText("");
                });
              }}
            >
              <label className={s.label}>
                Your comment
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  maxLength={1000}
                />
              </label>
              <button className={s.primary} disabled={busy || !text.trim()}>
                Post comment
              </button>
            </form>
          ) : (
            <p>Log in to add a comment.</p>
          )}
          {comments.map((comment) => (
            <article key={comment._id} className={s.comment}>
              <strong>{comment.author?.name || "Player"}</strong>
              <small>{new Date(comment.createdAt).toLocaleString()}</small>
              <p>{comment.text}</p>
              {(comment.author?._id === userId || author === userId) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const data = await feedRequest(
                        `/posts/${post._id}/comments/${comment._id}`,
                        token,
                        {},
                        "DELETE",
                      );
                      setComments((prev) =>
                        prev.filter((c) => c._id !== comment._id),
                      );
                      onUpdate(data);
                    })
                  }
                >
                  Delete comment
                </button>
              )}
            </article>
          ))}
          {!comments.length && (
            <p className={s.notice}>No comments yet. Start the conversation.</p>
          )}
          {next && (
            <button
              disabled={busy}
              onClick={() => run(() => loadComments(true))}
            >
              Load older comments
            </button>
          )}
        </div>
      )}
      {showChallenge && (
        <div className={s.panel}>
          <h4>Challenge {post.author?.name || "this player"}</h4>
          <p className={s.notice}>
            Send an invitation. A match is created only after the recipient
            accepts.
            {isTeamSport(post.sportTag)
              ? " Team invitations go to the opposing squad’s manager."
              : " Doubles invitations reserve one place on each side; two more players join after acceptance."}
          </p>
          {isTeamSport(post.sportTag) && (!own.length || !opponents.length) ? (
            <p className={s.notice}>
              Both sides need eligible squads for {post.sportTag}. Manage or
              join squads in Compete → Team sports first.
            </p>
          ) : (
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = Object.fromEntries(new FormData(form));
                void run(async () => {
                  await feedRequest(`/posts/${post._id}/challenges`, token, {
                    ...f,
                    discipline,
                    scheduledAt: f.date
                      ? new Date(String(f.date)).toISOString()
                      : undefined,
                    context: {
                      course: f.course,
                      tees: f.tees,
                      par: Number(f.par),
                    },
                  });
                  setShowChallenge(false);
                  setNotice(
                    "Challenge sent. The recipient can respond in the challenge inbox.",
                  );
                  onChallenge();
                });
              }}
            >
              {isTeamSport(post.sportTag) ? (
                <>
                  <label className={s.label}>
                    Your squad
                    <select name="fromSquad" required>
                      <option value="">Choose squad</option>
                      {own.map((q: any) => (
                        <option key={q._id} value={q._id}>
                          {q.name} · {q.format}-a-side
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.label}>
                    Opponent squad
                    <select name="toSquad" required>
                      <option value="">Choose opponent</option>
                      {opponents.map((q: any) => (
                        <option key={q._id} value={q._id}>
                          {q.name} · {q.format}-a-side
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={s.notice}>
                    Choose squads of the same format. Accepted invitations
                    create results-only matches.
                  </p>
                </>
              ) : (
                <label className={s.label}>
                  Challenge discipline
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    disabled={!!post.discipline}
                  >
                    {disciplines(post.sportTag).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isTeamSport(post.sportTag) && d?.mode === "strokes" && (
                <>
                  <label className={s.label}>
                    Course
                    <input name="course" required maxLength={120} />
                  </label>
                  <label className={s.label}>
                    Tees
                    <input name="tees" required maxLength={60} />
                  </label>
                  <label className={s.label}>
                    Total course par
                    <input
                      name="par"
                      type="number"
                      required
                      min={d.holes! * 2}
                      max={d.holes! * 6}
                    />
                  </label>
                </>
              )}
              <label className={s.label}>
                Venue (optional)
                <input name="venue" maxLength={120} />
              </label>
              <label className={s.label}>
                Proposed date (optional)
                <input type="datetime-local" name="date" />
              </label>
              <button className={s.primary} disabled={busy}>
                Send challenge
              </button>
              <button type="button" onClick={() => setShowChallenge(false)}>
                Cancel
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
