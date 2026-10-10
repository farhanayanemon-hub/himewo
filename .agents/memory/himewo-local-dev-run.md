---
name: Running HiMewo apps locally in a fresh Replit account
description: Why all local workflows fail on a fresh clone and the minimal fix per app.
---

# Fresh Replit account = NO node_modules → every workflow FAILS

A freshly-migrated account has the source but no installed deps, so ALL workflows fail on startup with tell-tale messages:
- `vite: not found` (admin, web)
- `Could not resolve "ws" / "jose"` esbuild errors (api-server build)
- `Command "expo" not found` (mobile, mobile-chat)

This is NOT a code bug — it just needs an install. Do not chase the code.

## Minimal fix per app
- **admin** and **web** are pure frontends: they talk to the LIVE backend via `VITE_API_URL` (=`https://api.himewo.com`) and auth via Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`). To run either locally you only need its deps — **no local api-server, no DATABASE_URL**. Use a filtered install:
  `pnpm install --filter "@workspace/admin..."` (the trailing `...` pulls in its workspace libs). Took ~13s, populates `artifacts/admin/node_modules/.bin/vite`. Then restart the workflow.
- **api-server** needs `ws`, `jose`, drizzle, etc. and DATABASE_URL at runtime — heavier; only install it if the user actually needs the local backend (usually they don't, since admin/web use the live one).
- **mobile / mobile-chat** are Expo — heaviest install (native packages); this is where the full-workspace `pnpm install` is most likely to stall. Install per-app with `--filter` only when needed. NOTE: a combined filtered install `pnpm install --filter "@workspace/web..." --filter "@workspace/mobile..." --filter "@workspace/mobile-chat..."` completed cleanly in ~57s with NO deadlock — the stall risk is specifically the *full unfiltered* workspace install (and /tmp), not filtered Expo installs. The two Expo apps run on their own ports (mobile 18115, mobile-chat 18116) but share one `$REPLIT_EXPO_DEV_DOMAIN`, so the screenshot tool can only render one at a time — verify the other via its workflow log, not a screenshot.

**Why filtered:** full-workspace `pnpm install` risks deadlock in the linking phase on this env (see himewo-tmp-build-instability). Filtered installs avoid pulling the heavy Expo trees when the user only needs admin/web.

**How to apply:** when the user reports "admin/web shows errors on every tab / can't login", first `refresh_all_logs` — if you see `vite: not found`, it's missing deps, not a real error. Filtered-install that one app and restart its workflow.
