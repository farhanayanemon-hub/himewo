---
name: HiMewo handoff — continue on a fresh Replit account
description: What a new agent/account needs to keep working on HiMewo: live state, the external repo, and the exact secret NAMES that must be re-added (values never transfer).
---

# HiMewo handoff guide (read this first on a new account)

The real app is the EXTERNAL GitHub repo **github.com/farhanayanemon-hub/himewo**
(NOT the Replit skeleton). Edit it via the GitHub Git Data API + `GITHUB_TOKEN`
(see `himewo-github-push.md`). The Replit project is mostly memory + skills +
tooling.

There is a top-level `MIGRATION.md` in the repo with the full paste-able handoff
prompt + step-by-step for a new account — keep it in sync with this file.

## Current live state (as of 2026-06-30)
- **marketplace location** (latest feature, LIVE): listings carry lat/lng, "near me" radius search sorted by distance, keyless OpenStreetMap/Nominatim geocoding + autocomplete on create+browse (web & mobile). See `himewo-marketplace-location.md`.
- **web**: himewo.com — Cloudflare Pages (project `himewo`), auto-deploys on push to main via GitHub Actions.
- **mobile previews** (view-only web mirrors): social → https://himewo-mobile.pages.dev, Messenger/chat → https://himewo-chat.pages.dev (rebuild steps in `himewo-preview-web-links.md`). Messenger app was rebuilt to a Facebook-Messenger UI (4-tab shell incl. Notifications, Messenger settings menu, 2-tab message requests) — all wired to the live backend.
- **admin**: admin.himewo.com — Cloudflare Pages (project `himewo-admin`), own Action. Login = Supabase email+password, gated by `/api/admin/me` (role admin/moderator/support). WORKING.
- **api-server**: api.himewo.com — Railway (project `hospitable-nourishment`, builder RAILPACK, pnpm 9.15.9). `/api/admin/*` suite is LIVE (deploy fixed 2026-06-27).
- **DB/Auth**: Supabase project ref `rzdfgbfyhnkvqbcegguk` (Postgres + Auth, ES256 JWTs). Admin user ovirajemon11@gmail.com (role=admin).
- **mobile**: Expo app in the same repo (see `himewo-mobile-design-tokens.md`).

## Secrets that MUST be re-added on the new account
Replit secrets do NOT transfer with a zip/import — re-enter every one of these
(names only; get the values from the OLD account's Secrets pane or the providers):
- `GITHUB_TOKEN` — push to the himewo repo (needs `repo` + `workflow` scopes).
- `RAILWAY_TOKEN` — trigger/inspect api-server deploys on Railway.
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — Pages deploys + DNS for web/admin.
- `SUPABASE_ACCESS_TOKEN` — Supabase Management API (DDL, Auth config). Needs a `User-Agent` header or 403.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase (admin DB ops).
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client Supabase config (web/admin builds).
- `VITE_API_URL` — frontend → api.himewo.com base URL.
- `SESSION_SECRET` — server session signing.

## How to continue
- Make app changes by committing to the himewo repo via GitHub API (large files:
  use `gh api --input <jsonfile>`, never inline `-f content=` — see himewo-admin-deploy.md).
- Deploys: web/admin via push→Actions (Cloudflare); api-server via Railway
  `serviceInstanceDeploy` mutation (himewo-admin-deploy.md has IDs + poll/log queries).
- The user writes Banglish and is non-technical / low on credits — ALWAYS reply in Banglish, keep it simple, avoid burning credits.
