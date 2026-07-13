# HiMewo — Move to a new Replit account & continue work

This repo is a **pnpm monorepo** with multiple artifacts (apps). Everything below
gets you from a fresh Replit account to a running, deployable project.

## What's in here
| Artifact | Dir | Kind | Notes |
|---|---|---|---|
| HiMewo (web) | `artifacts/web` | React + Vite | main social web app → himewo.com |
| Admin Panel | `artifacts/admin` | React + Vite | admin dashboard |
| HiMewo Ads Manager | `artifacts/ads-dashboard` | React + Vite | ads manager |
| HiMewo (mobile) | `artifacts/mobile` | Expo | social mobile app + web mirror |
| HiMewo Chat (mobile) | `artifacts/mobile-chat` | Expo | chat mobile app + web mirror |
| API Server | `artifacts/api-server` | Node/Express | backend → Railway |
| Canvas / Mockups | `artifacts/mockup-sandbox` | Vite | design sandbox |

## Toolchain (must match)
- **pnpm `10.26.1`** (pinned in root `package.json` → `packageManager`). A different
  pnpm version makes `--frozen-lockfile` installs fail.
- Replit modules: `nodejs-24`, `python-3.11`, `postgresql-16` (nix channel `stable-25_05`).

## Step-by-step (new account)
1. **Import the repo**: create a new Repl → "Import from GitHub" →
   `farhanayanemon-hub/himewo` (branch `main`). (Or fork if you own it.)
2. **Add secrets** (Tools → Secrets). Names are in `.env.example` under
   "Replit dev workspace secrets". You must paste the real values yourself — they
   are intentionally NOT in git. Minimum to run + deploy:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `SESSION_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `GITHUB_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `RAILWAY_TOKEN`.
3. **Install**: `pnpm install` at the repo root.
4. **Run**: each artifact has a workflow (auto-generated from its `artifact.toml`).
   Start the ones you need (e.g. `artifacts/web: web`). Each service binds to `PORT`.
5. **Verify** the app loads in the preview, then continue building.

## Backend / data (external — unchanged by the move)
- **Database + Auth**: Supabase (same project). Set `DATABASE_URL`, `SUPABASE_*`
  on Railway (see `artifacts/api-server/.env.example`).
- **API server**: hosted on **Railway**, auto-builds from GitHub `main`. Stripe +
  Stream (getstream.io) keys live on Railway, not Replit.
- **Object storage**: Cloudflare R2 (`R2_*` on Railway).

## Deploy pipeline (how live works today)
- **Web / Admin / Ads**: Cloudflare Pages. Build the Vite app, then
  `npx wrangler pages deploy <dist> --project-name=<proj> --branch=main`.
- **API server**: push to GitHub `main` → Railway auto-builds.
- **Mobile web mirrors** (`himewo-mobile` / `himewo-chat` on `*.pages.dev`):
  `expo export --platform web` per app, then `wrangler pages deploy`.
- Git CLI push is blocked in the Replit sandbox; pushes go through the GitHub REST
  API (a small helper script). Set `GITHUB_TOKEN` and re-create the helper if needed.

## Agent memory
Durable engineering notes live in `.agents/memory/` (`MEMORY.md` is the index).
Read it before making changes — it captures non-obvious decisions and gotchas.
