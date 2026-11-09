# Compete: individual and team sports

Open **Compete → Team sports**. All seven sports share the club, roster approval, challenge, confirmation, dispute and squad-rating workflow. **Compete → Individual sports** retains Tennis, Padel and Pickleball. Soccer is no longer a separate navigation feature; `/soccer` redirects to its selection under Compete.

## Supported sports

| Sport               | Squad formats            | Result score | Detailed player records                                       |
| ------------------- | ------------------------ | ------------ | ------------------------------------------------------------- |
| Soccer              | 5, 7, 11                 | Goals        | Minutes, goals, assists                                       |
| Volleyball          | 6; beach doubles         | Sets won     | Sets played, kills, assists, digs, blocks, aces               |
| Football (American) | 11; 7 and 5 flag formats | Points       | Minutes, passing/rushing/receiving yards, touchdowns, tackles |
| Handball            | 7                        | Goals        | Minutes, goals, assists, saves                                |
| Basketball          | 5, 3                     | Points       | Minutes, points, rebounds, assists, steals, blocks            |
| Baseball            | 9                        | Runs         | Innings participated in, hits, runs, RBI, pitching strikeouts |
| Hockey (ice)        | 6 including goalkeeper   | Goals        | Minutes, goals, assists, shots, saves                         |

Positions and dominant-side labels also follow the selected sport. Profiles, appearances, squad rankings and format filters remain separate for each sport. Baseball participation counts whole innings participated in, not fractional innings pitched. Statistics are team-recorded, not independently verified or a personal ability rating.

The authoritative catalog is `config/sports.json`, shared by backend validation and frontend controls. `Volleyball` is the canonical name; the backend accepts the `Volley-Ball` spelling too. Registration filters starting-sport choices by team/individual interest and saves the preference without restricting future roles.

## Club and match workflow

1. Create an optional club, then a squad for the selected sport and format. Clubs may have squads in several sports. Only the club owner can create its squads; independent squads need no club.
2. A player requests membership and the manager accepts, or the manager invites an existing account by email and the player accepts. Notifications are in the in-app membership inbox; no emails are sent. Use Refresh for new requests and results. Managers are not automatically rostered as players.
3. Accepted players form the roster. Players can join multiple squads, leave, or be removed. Historical match lineups survive roster changes.
4. Managers challenge squads of the **same sport and format**, managed by another person. The opponent accepts or declines. Historical match dates are allowed; results cannot be submitted before the match date.
5. **Results only** needs the final squad score. **Detailed tracking** additionally requires each manager to save their own participating players, positions and sport-specific statistics. A player cannot appear for both teams in a match.
6. The opposing manager confirms or disputes the submitted result. Disputes change no ratings and allow correction. Confirmation atomically commits both squad updates exactly once and locks the result/lineups. Detailed statistics are counted on player profiles only after result confirmation; confirmation does not independently verify each statistic.

Basketball, Baseball, Hockey and Volleyball require a decided result; include overtime/extra innings before submitting. Volleyball scores are sets: indoor accepts a decided best-of-three or best-of-five match; beach is best of three. Player sets played cannot exceed the match's total sets. Sport-specific checks prevent recorded scoring contributions from exceeding the squad score where comparable; hockey permits two assists per goal.

## Squad Elo

Every sport/format starts at 800; the first 10 confirmed matches are provisional. K=32 and expected score is `1/(1+10**((opponentRating-rating)/400))`. Wins score 1, draws 0.5 (where allowed), losses 0. Score-margin multiplier is `1+min(max(abs(homeScore-awayScore)-1,0)*marginStep,0.25)`, where `marginStep` comes from the sport catalog. This keeps points, runs and sets from using an uncapped soccer goal multiplier. Ratings are bounded to 0–1,500 and rounded to two decimals. Rankings include squads with zero confirmed matches. Players never inherit squad Elo.

## Social categories

All fourteen supported sports are available when composing or editing a feed post and when filtering the feed. My Sports includes accepted squad memberships and saved team-player identities as well as individual sport participation.

Communities have a sport category or **General**. Creators choose the category at creation and can change it later; existing post tags are preserved. The Communities view can be filtered by category, and a visible feed navigation works on mobile. Legacy uncategorized communities appear as General.

## Compatibility and setup

Existing soccer squads, matches, rosters, ratings and player identity remain intact. Old records without a sport field are treated as Soccer. Original storage collections and the legacy `/api/soccer` alias are retained; the general API is `/api/team-sports`. Team-sport identities are saved independently in `User.teamProfiles`; legacy `User.soccer` remains a fallback for old soccer data. Old individual-style soccer matches are preserved, not converted into team results. New team matches use Compete's team workflow.

The general API uses `/api/team-sports` with a `sport` query parameter, for example `/api/team-sports?sport=Basketball`. Mutations must specify the same sport as their squad or match. `/api/team-sports/participation` returns all team sports associated with the current user.

No new dependencies or destructive database migration is needed. Backend startup adds missing catalog sports without deleting existing sports. Pull the changes, then restart the root API (`npm run server`) and frontend (`npm run dev` from `frontend`). Keep existing `MONGO_URI` and `JWT_SECRET` in the ignored root `.env`. MongoDB must run as a replica set (including single-node local or Atlas), since match transitions use transactions.

## Validation

`npm test` runs existing checks plus sport-rule tests. Integration tests explicitly skip unless `SOCCER_TEST_MONGO_URI` is set to a localhost replica set. The existing variable name is retained for compatibility; the integration now covers **all seven sports**, categories, authorization, score confirmation, profile/ranking isolation and old soccer data.

```sh
SOCCER_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm test
cd frontend
npm run build
```

Integration tests create and remove a unique `najma_soccer_test_*` database and reject non-local hosts. Never use production credentials. Club role delegation, external statistics integrations and email delivery remain future work.
