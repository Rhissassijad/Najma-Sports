const test = require("node:test"),
  assert = require("node:assert/strict");
const app = require("../app");
test("production app registers team-sports and follow routes before the API fallback", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, method] of [
    ["/api/team-sports", "GET"],
    ["/api/team-sports?sport=Basketball", "GET"],
    ["/api/users/69ca15aa807a21a113ee9cde/follow", "POST"],
    ["/api/feed/posts/69ca15aa807a21a113ee9cde/reaction", "POST"],
    ["/api/feed/challenges", "GET"],
  ]) {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401);
    assert.doesNotMatch((await res.json()).message, /route not found/i);
  }
  const health = await (await fetch(base + "/api/health")).json();
  assert.equal(health.features.teamSports, true);
  assert.equal(health.features.following, true);
  assert.equal(health.features.socialInteractions, true);
  const missing = await fetch(base + "/api/no-such-route");
  assert.equal(missing.status, 404);
});
