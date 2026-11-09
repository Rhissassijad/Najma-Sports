Najma Sports is a social platform designed for sport lovers accross the globe, allowing users to connect with each other, organize matches, follow their performances and interact with a dynamic sports community. It embodies my vision of the ideal platform for athletes and sports fans :
Athletes can meet players of the same level (or teams depending on the sport) in the area thanks to my precise ranking system (still in development), challenge them and track their performances.
Fans on the other hand can interact thanks to the feed platform : a place where they can comment sports events, follow their favorite users, create and join communities to discuss a certain topic in particular.
This project is still new and in active development. I still plan on adding a "live" section where people can follow the score of their favorite sports in real time, comment under the match or share their pronostics as well as a marketplace where people can sell their sports equipment.
The goal is to create an environment where competition, social engagement and athletes' interactions meet in one place.
This is a college project. It might eventually lead to something more serious in the near future.

## Compete: team sports

Clubs, independent squads, roster approvals, result confirmation, squad Elo and team-recorded player statistics are available for Soccer, Volleyball, Football, Handball, Basketball, Baseball and Hockey under Compete. See [the team sports guide](docs/team-sports.md) for setup, workflows and tests.

## Individual disciplines

Tennis, Padel, Pickleball, Badminton, Table Tennis, Swimming and Golf now have discipline-aware profiles, competition and results. See [the individual sports guide](docs/individual-sports.md) for events, scoring, rankings and the automatic rating-index migration.

## API route errors after updating

After pulling changes, stop the old backend process (Ctrl+C in its terminal) and run `npm run server` from the repository root. Restart the frontend too; restarting Next.js alone does not reload the API on port 8080. Starting a second backend on the same port now reports an explicit port-in-use error.

`GET /api/health` identifies the current backend's capabilities, including `features.teamSports` and `features.following`. If that endpoint or `/api/team-sports` still reports “API route not found,” check that the running backend is from this checkout and that `NEXT_PUBLIC_API_URL` points to it. That setting accepts either an origin such as `http://localhost:8080` or a URL ending in `/api`; the feed and competition now share the same configured base.

## Community interactions and API diagnostics

Like/dislike, comments, direct post sharing and invitation-based challenges are available on posts. From the repository root, `npm run check:api` verifies that the backend process has the current features. See [the community guide](docs/community-interactions.md) for restart instructions, permissions and challenge behavior.
