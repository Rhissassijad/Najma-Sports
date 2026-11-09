# Community post interactions

## Running the correct API

The frontend messages about missing team-sports/follow APIs mean the process answering those requests does not have the registered routes. Updating frontend files alone cannot replace an already running Node backend.

1. From the actual `Najma-Sports` checkout, run `git pull origin main`.
2. Stop the old API terminal with **Ctrl+C**.
3. From the repository root, run `npm run server` and leave that terminal open.
4. From another terminal, run `cd frontend` and `npm run dev`.
5. From a third terminal in the repository root, run `npm run check:api`.

The diagnostic checks the API process's health and capability flags. It must report that team sports, following and social interactions are available. A port-in-use error means another process is still listening. On macOS/Linux, `lsof -nP -iTCP:8080 -sTCP:LISTEN` identifies it; stop the appropriate backend process rather than starting another copy or indiscriminately stopping Node processes.

If your API is on another origin, pass it explicitly: `npm run check:api -- https://your-api.example`. The frontend's `NEXT_PUBLIC_API_URL` must point to that same backend. Both an origin and a URL ending in `/api` are supported. Frontend environment-variable changes require restarting/rebuilding Next.js. Do not put credentials in the API URL or post secret values in chat.

The API still needs the existing `MONGO_URI` and `JWT_SECRET` in the ignored root `.env`. Transactions require MongoDB running as a replica set, including single-node local setups or Atlas. These settings belong in the backend, not the frontend.

## Reactions and comments

- Like and Dislike persist across reloads. Each player has at most one reaction per post. Selecting the active reaction removes it; selecting the other switches it. Counts reflect the stored records.
- Comments persist, support 1–1,000 characters, and load the newest 50 first, with a Load older control for pagination.
- Comment authors can remove their own comments. Post owners can moderate comments on their posts. Other users cannot remove them.
- Community membership is required to read or interact with community posts. Sharing a link does not bypass that membership check.
- Deleting a post also removes its reactions and comments. Related accepted matches and challenge history remain preserved.

## Sharing

Share uses the browser's share dialog when available, otherwise copies a direct `/feed?post=...` link. If clipboard access is denied or unavailable, it displays a selectable link for manual copying. The direct link loads the specific post even if it is outside the feed's latest 250 items. Sharing does not automatically post to another service and is not an in-app repost counter.

## Challenges

Challenge on another player's post opens an invitation form for that post's sport and discipline. Nothing is created as a match until the recipient accepts.

Individual invitations reserve the challenger and opponent on opposite sides. Singles becomes ready for a result after acceptance. Doubles/mixed doubles still require one more player on each side. Golf invitations require course/tees/par. Optional proposed dates must be in the future; an invitation whose proposed date has passed must be declined/replaced.

Team invitations require the sender to manage a squad. The opposing squad must belong to the post's sport, use the same format, and be managed by or include the author as an accepted player. The invitation goes to the opposing **manager**, who can accept or decline it. Acceptance creates a scheduled, results-only team match. Detailed statistics can still be arranged through the regular team match flow.

The feed's Challenge inbox shows the latest 100 incoming/outgoing invitations. Use Refresh challenges for new activity. Recipients accept/decline; senders cancel pending invitations. Duplicate pending invitations from the same player to the same post/opponent/discipline/squad pairing are rejected. Concurrent acceptance creates only one match. Accepted invitations provide a link into Compete's match view.

Challenges are in-app invitations; this release does not send email, push notifications or private messages. Match result confirmation and rating rules remain unchanged.

## Verification

The existing localhost replica-set integration test command runs the new interaction tests alongside the earlier suites:

```sh
SOCCER_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm test
```

Tests use isolated temporary databases, enforce ownership/community permissions, and cover reactions, comments, sharing access, challenge acceptance, team-manager routing, doubles places, cancellation and post cleanup. Browser checks exercise the actual API. No new dependencies are required.
