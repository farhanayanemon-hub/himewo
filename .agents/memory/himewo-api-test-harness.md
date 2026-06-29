---
name: API-server test harness
description: How to write DB+HTTP tests for artifacts/api-server (vitest)
---
# api-server vitest patterns

- Tests run against the REAL Postgres in `DATABASE_URL` (no mocking). Pattern: insert fixtures in `beforeAll`, delete the root profile(s) in `afterAll` (FK `onDelete: cascade` wipes posts/reels/settings/saved/etc.), then `await pool.end()`.
- `pool.end()` is safe per-file because vitest forks a worker per test file (pool is not shared across files).
- To test ROUTES (not just lib fns), stand up the Express app in-process: `createServer(app).listen(0)`, read the port, then `fetch`. Auth uses a dev bearer token: `Authorization: Bearer dev:<uuid>` — accepted whenever `NODE_ENV !== production` (default in tests). No Supabase/JWT needed.
- Profile-lock privacy is enforced in THREE layers: feed-author filter lives in the `/feed` route, `/users/:id/posts` empty-timeline check lives in the users route, and intro/embedded-profile stripping lives in `serialize.ts` (toProfile never includes intro). Test all three layers, not just serialize.
- The whole suite runs as the `api-server-test` validation step (`pnpm --filter @workspace/api-server run test`, real Postgres via `DATABASE_URL`), alongside `api-codegen-drift` / `*-typecheck`. It catches behavioral/privacy-gate regressions that typecheck can't.
- `isLocked` has TWO meanings: in `buildListProfiles` it's the raw `userSettings.isLocked` setting; in `buildProfileDetail` it's VIEWER-RELATIVE = `restricted` for non-owners (false for a friend/owner who can see the intro). Don't assert `isLocked===true` for a friend — they aren't restricted.
