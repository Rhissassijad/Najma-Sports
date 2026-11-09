# Individual sports and disciplines

Under **Compete → Individual sports**, select a sport and discipline/event before creating a match, viewing rankings, or recording a performance. The shared catalog (`config/sports.json`) powers registration, profile participation, match rules, feed post categories and community categories.

| Sport        | Supported disciplines                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tennis       | Singles, doubles, mixed doubles                                                                                                                                             |
| Padel        | Singles (singles court), doubles, mixed doubles                                                                                                                             |
| Pickleball   | Singles, doubles, mixed doubles                                                                                                                                             |
| Badminton    | Singles, doubles, mixed doubles                                                                                                                                             |
| Table Tennis | Singles, doubles, mixed doubles                                                                                                                                             |
| Swimming     | Freestyle 50/100/200/400/800/1,500 m; backstroke, breaststroke and butterfly 50/100/200 m; individual medley 200/400 m; additionally 100 m individual medley in a 25 m pool |
| Golf         | 9-hole and 18-hole gross stroke play                                                                                                                                        |

Swimming events have distinct **25 m and 50 m pool** disciplines: short-course and long-course results are never pooled. The catalog covers common pool events; relays, open water, golf match play and handicap/net competitions are not part of this release. Mixed doubles is participant-declared; the application does not certify eligibility.

## Racket matches

Singles needs two participants. Doubles and mixed doubles need four, with two self-joining participants per side. A full match accepts a final points/games score or comma-separated set/game scores. All scores must be decided, non-negative whole numbers. This records the submitted final result; it does not certify every federation's scoring rules.

After one participant submits a result, **every other participant must confirm** before ratings update. A teammate's confirmation alone cannot finalize doubles. Duplicate/concurrent confirmations do not update the ratings twice. Players retain separate ratings, match counts, provisional status and histories for each discipline. Doubles compares side-average ratings and applies each player's experience-based Elo adjustment to their own doubles rating. Singles ratings are unaffected.

Existing pending two-player results remain confirmable. Historical match sides default to the original player order when no side assignment was stored.

## Swimming and golf performance

Swimming uses a positive time in **seconds**, with up to millisecond precision. Displays use minutes:seconds. Golf uses a positive whole-number gross stroke total, at least one stroke per hole. Lower values rank first. Neither sport fabricates an Elo rating from times or strokes.

Use **My results** for self-reported performances. Dates cannot be in the future. Self-reported records can be removed by their owner. Alternatively, create a two-person head-to-head event: opponent confirmation records both performances as **opponent-confirmed**. That label is not official timing, federation verification, or a certified golf score.

Rankings show each player's all-time best result in the selected discipline and source. Self-reported and opponent-confirmed results are separate. Equal results share a rank. Personal history shows the latest 100 records; profile personal bests query the full history independently of this limit.

Golf comparisons require the same user-entered **course, tees, total par and number of holes**. Course and tee keys ignore case and repeated whitespace. Different courses/tees/par are not combined; this is not an official handicap index or course-rating system. Enter course names unambiguously, including location where appropriate.

## Profiles, registration and social categories

Add a sport **and discipline/event** in Profile → My Sports & Levels. Multiple disciplines of one sport can coexist. Racket profiles show discipline Elo; swimming profiles show separate personal bests by source, and golf profiles show course-labeled rounds. My Activity displays complete doubles sides and event-aware scores.

Registration can select a starting individual sport and event. These are preferences, not restrictions on future sports. New sports appear in feed creation/edit/filter controls and community categories. Optional discipline tags let users categorize a post or community as, for example, Badminton doubles or 50 m freestyle in a 25 m pool. Sport-wide posts/communities remain supported. Changing sport clears an incompatible event tag; a community creator can change its discipline without rewriting existing post tags.

## Startup migration and compatibility

Pull the code and restart **both** the root API and frontend. No new packages are required. MongoDB must support replica-set transactions as before.

On API startup, the repeatable migration backfills missing discipline fields with the catalog default, preserves existing scores and ratings, creates the unique `(userId, sportId, discipline)` index, and **only then** drops the original two-field unique rating index. Existing two-player racket history is classified as singles, including legacy Padel records; it is not relabeled as doubles. No player, rating or match documents are deleted. The database account needs index creation and removal privileges. An index error stops startup rather than discarding conflicting records.

`UserSport` records for timed/stroke disciplines represent participation; their legacy numeric defaults are not displayed as ratings. Authoritative time/stroke records live in the new `performances` collection. Legacy API URLs continue to work, with optional discipline parameters. Omitted racket discipline defaults to singles.

## Validation

```sh
SOCCER_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' npm test
cd frontend
npm run build
```

`INDIVIDUAL_TEST_MONGO_URI` can be used for just the individual integration suite. The integration tests require localhost, use a unique temporary database, and remove only that database afterward. They test index migration repeatability/data preservation, four-person doubles, concurrent confirmation, rating isolation, swimming pool/source separation, golf context and scoring, ownership, and social event categories. Without a local test URI, integration suites explicitly skip rather than claim coverage.
