# Soccer: squads and individual performance

Open **Soccer** from the main navigation, or visit `/soccer`. Existing personal accounts work; no new account is required. Registration captures sport interests and whether you want to play, manage, or join. Preferences do not restrict future roles or sports. Team onboarding leads through login to the Soccer hub.

## Workflow

1. A person creates an optional club, then a squad (5-, 7-, or 11-a-side). Only the club owner can create its squads. Independent squads need no club. The creating person manages the squad. Management does not automatically put that person on the playing roster.
2. Players request to join and the manager accepts, or the manager invites an existing account by email and the player accepts. Requests and invitations appear in the Soccer membership inbox. Use Refresh to fetch new requests, invitations and results. No email delivery is implemented.
3. Accepted players appear in the roster. Managers may remove them; players may leave. Players may belong to multiple squads. Completed match lineups remain historical records after roster changes.
4. A manager challenges another person's squad in the same format. The opponent accepts or declines. The date may be historical, but results cannot be recorded before the match date.
5. **Results only:** submit the home and away goals. No player statistics are required or inferred.
6. **Detailed tracking:** each manager saves their own lineup, including positions, minutes, goals and assists. Both lineups are required before submitting a result. Only accepted, distinct roster members can be selected, and a player cannot appear on both sides in the same match. Recorded goals and assists cannot exceed the team score. Set unrecorded players' values to zero; there is no completeness or independent verification claim.
7. The opposing manager confirms or disputes a result. A dispute allows corrections and resubmission; it changes no ratings. A confirmed result atomically updates both squads exactly once and locks the result and lineups.
8. Open a roster player's name to view their soccer identity and performance. Preferred position and foot are self-described. Individual statistics are **team-recorded**, grouped by format, and only come from detailed matches whose results were confirmed. Opponent confirmation verifies the match result, not the individual statistics.

## Ratings

Squads start at 800. Elo uses K=32 with expected score `1 / (1 + 10 ** ((opponentRating - rating) / 400))`; a draw counts as 0.5. Goal difference multiplies the update by `1 + min(max(goalDifference - 1, 0), 5) * 0.05`, capped at 1.25. Ratings are rounded to two decimals and bounded to 0–1,500. A squad is provisional for its first 10 confirmed matches. Formats have separate rankings. Every squad in a format is included, even with zero matches. Individual players do **not** inherit squad Elo or receive an invented ability score.

The original two-player soccer records are preserved in the database. New soccer creation uses the squad workflow; legacy soccer ratings are omitted from the individual-sport profile and competition panels. No automatic conversion of historical one-versus-one results is performed.

## Database and local development

Use the existing root and frontend `npm ci` installations. No new packages are required.

The root backend needs `MONGO_URI` pointing to a **MongoDB replica set** (including a single-node local replica set or Atlas), plus your existing `JWT_SECRET`. Keep these in the ignored root `.env`. A standalone MongoDB server cannot execute match transition transactions. The repository's `scripts/fix-local-mongodb.cjs` can prepare a macOS/Homebrew installation; inspect its documented assumptions before using it. Do not share secret values in commands or commit `.env`.

Start `npm run server` from the repository root and `npm run dev` from `frontend`. Defaults are API port 8080 and frontend port 3000. The soccer page uses `NEXT_PUBLIC_API_URL` when configured, otherwise the existing localhost API default.

New collections: `soccerclubs`, `soccersquads`, `soccermatches`. Existing users gain optional `soccer` identity and `onboarding` fields; no destructive migration is required. Club ownership and squad management currently stay with their creating users. Role delegation, club verification, external statistics integrations, advanced metrics, automated personal ability scores, competition eligibility and real-time notifications are future work.

## Validation

Run `npm test` for existing tests and soccer rule tests. The integration test explicitly skips without its opt-in database variable. To run it, supply `SOCCER_TEST_MONGO_URI` for a **localhost replica set**, for example:

```sh
SOCCER_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm test
```

The test creates a unique `najma_soccer_test_*` database and drops only that database afterward. It rejects non-local hosts. It covers registration preferences, membership approval, manager authorization, format separation, detailed lineups, disputes, concurrent confirmation, results-only matches, and historical statistics after leaving a roster. Never use production database credentials for tests.

From `frontend`, run `npm run build` for production compilation and TypeScript validation.
