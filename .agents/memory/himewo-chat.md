---
name: HiMewo Chat carve-out
description: How the standalone chat app was carved from the full social clone; non-obvious build/run quirks.
---

# HiMewo Chat

A standalone Messenger-style Expo app carved out of a full social-platform clone (same workspace template). Chat-only: login, inbox, threads, stories, voice/video calls. The user explicitly does NOT want the full social platform rebuilt, and no web artifact.

**Auth without external setup:** when Supabase env is absent, the app authenticates with seeded DEV_USERS using `dev:${uuid}` bearer tokens (or `x-dev-user-id` header). Seed script prints the user UUIDs.

**Stale-build 404 trap:** the api-server dev workflow (`artifacts/api-server: API Server`) builds at startup via esbuild and serves the bundle — it does NOT hot-reload route changes. After editing routes (or resuming a session where the server predates the routes), restart that workflow or every new route returns `Cannot GET /api/...` while `/api/healthz` still works.
**Why:** wasted time debugging a "missing" route that was actually a stale running build.
