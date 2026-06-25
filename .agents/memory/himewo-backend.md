---
name: HiMewo backend conventions
description: Non-obvious conventions for the api-server artifact — dev auth, codegen naming, running scripts without tsx, and the authorization model.
---

# HiMewo backend (artifacts/api-server)

## Dev auth fallback (non-production only)
Authentication resolves the current user from, in order: `x-dev-user-id:<uuid>` header, `dev:<uuid>` bearer token, or `DEV_USER_ID` env. `requireAuth` returns 401 when none present. In production, real Supabase JWT verification is used (env-driven). `getUser` guards the id with a UUID regex.

**Why:** lets you smoke-test protected endpoints locally without Supabase creds.
**How to apply:** curl with `-H "x-dev-user-id:<uuid>"`. Primary seeded dev user (Ahnaf) = `00000000-0000-4000-8000-000000000001`; seeded users are `...0NN` for N=1..8.

## Running scripts (no tsx installed)
There is no `tsx`. Scripts (seed, etc.) are bundled by `build.mjs` (esbuild, add to entryPoints) and run via `node dist/<name>.mjs`. Seed is idempotent via `TRUNCATE profiles CASCADE`. Re-seed after smoke tests to clear test rows, then restart the workflow.

## Codegen zod naming (from openapi.yaml)
Per operation: path params = `<Op>Params`, query = `<Op>QueryParams`, body = `<Op>Body`, response = `<Op>Response`. Endpoints returning void use `res.sendStatus(204)`.

## Authorization model (src/lib/authz.ts)
Helpers: `areFriends`, `isGroupMember`, `canViewPost`, `canViewComment`.
- `canViewPost`: author always; group posts → group members only; public → anyone; friends → author's friends; private → author only.
- `canViewComment(commentId, viewer)`: a comment is viewable iff its parent post is viewable (join comments→posts, reuse canViewPost).
- Friendships are stored as a canonical sorted pair, but `areFriends` queries BOTH directions via `or()` for safety.

**Why:** repeated code-review (architect) flagged IDOR/broken-access-control. Read-like endpoints must mask non-visible resources as **404** (not 403) to avoid existence leakage.
**How to apply:** EVERY new post/comment read-or-mutate-by-id endpoint (detail, comments, reactions incl. DELETE reaction, shares) must gate on canViewPost/canViewComment. Conversation/message endpoints (read, member-remove, message-reaction) and realtime typing/seen/stop_typing handlers must gate on conversation membership; member-remove allows self-removal or admin-removes-anyone. Don't forget DELETE-reaction paths — they were the easiest to miss.
