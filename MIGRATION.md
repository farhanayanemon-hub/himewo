# HiMewo — Migration / Handoff Prompt (move to a new Replit account)

This file is the **prompt + step-by-step guide** for continuing the HiMewo project
on a *different* Replit account. Paste the "PROMPT TO GIVE THE NEW AGENT" section
into the new account's Agent chat, then follow the manual steps below.

---

## IMPORTANT TRUTH FIRST

**The real, live application is the external GitHub repo, NOT the Replit project.**

- Repo: **https://github.com/farhanayanemon-hub/himewo**
- The Replit workspace is mostly the editing surface + memory + tooling.
- Web / Admin / Mobile mirrors are hosted on **Cloudflare Pages**.
- The API server is hosted on **Railway** (auto-builds from GitHub `main`).
- Database + Auth live on **Supabase**.

So "moving the project" = (1) clone the repo into the new Replit account,
(2) re-add the same secrets, (3) keep using the same GitHub/Railway/Cloudflare/Supabase
accounts. The hosted services do **not** move — they keep running; you just point the
new workspace at them.

---

## PROMPT TO GIVE THE NEW AGENT

> You are taking over the **HiMewo** project — a Facebook-style, Banglish-friendly
> social platform. The user is **non-technical and writes in Banglish, so always
> reply in simple Banglish** and avoid burning credits.
>
> The real app lives in the external GitHub repo
> **github.com/farhanayanemon-hub/himewo** (not the Replit skeleton). It is a pnpm
> monorepo with these artifacts:
> - `artifacts/web` — social website (React + Vite) → Cloudflare Pages project `himewo` (himewo.com)
> - `artifacts/admin` — admin panel (React + Vite) → Cloudflare Pages project `himewo-admin` (admin.himewo.com)
> - `artifacts/api-server` — Express 5 API → Railway (api.himewo.com), auto-builds on push to GitHub `main`
> - `artifacts/mobile` — main social Expo app → web mirror at himewo-mobile.pages.dev
> - `artifacts/mobile-chat` — Messenger Expo app → web mirror at himewo-chat.pages.dev
> - `lib/db` — Drizzle schema (source of truth for the DB)
> - `lib/api-spec/openapi.yaml` — API contract; run `pnpm --filter @workspace/api-spec run codegen` after editing it
>
> Backend = Supabase (Postgres + Auth, ES256/JWKS). Money is in **USD**.
>
> **Standing rule:** ALWAYS auto-sync after finishing work — push to GitHub AND
> deploy live — WITHOUT asking each time.
>
> Before doing anything, read the memory files in `.agents/memory/` (start with
> `himewo-handoff.md`, `himewo-deploy.md`, `himewo-github-push.md`,
> `himewo-cloudflare-pages-deploy.md`, `himewo-live-connection.md`). They contain
> the exact deploy mechanics, IDs, and gotchas.
>
> The git CLI is blocked — push to GitHub via the REST/Git-Data API using
> `GITHUB_TOKEN` (see `himewo-github-push.md`). Deploy web/admin with `wrangler`
> run from `/tmp` (outside the repo). The API deploys automatically when you push
> to `main`.

---

## STEP-BY-STEP IN THE NEW ACCOUNT

### 1. Get the code into the new workspace
Either import the GitHub repo when creating the Repl, or clone it:
```
git clone https://github.com/farhanayanemon-hub/himewo.git
```
(If you only imported the Replit zip, the code may be stale — always trust the
GitHub repo as the source of truth.)

### 2. Re-add ALL secrets (values do NOT transfer with an import)
Open the new Repl's **Secrets** pane and add every one of these. Copy the VALUES
from the OLD account's Secrets pane (or regenerate them from each provider):

| Secret name | Used for |
|---|---|
| `GITHUB_TOKEN` | Push to the himewo repo (needs `repo` + `workflow` scopes) |
| `RAILWAY_TOKEN` | Inspect/trigger api-server deploys (workspace token, GraphQL only) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deploys (Pages:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account for Pages/DNS |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API (DDL, Auth config) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin ops |
| `VITE_SUPABASE_URL` | Client Supabase URL (web/admin builds) |
| `VITE_SUPABASE_ANON_KEY` | Client Supabase anon key |
| `VITE_API_URL` | Frontend → api.himewo.com base URL |
| `SESSION_SECRET` | Server session signing |

> The values are secret — get them from the old account's Secrets pane. Never paste
> them into chat or commit them.

### 3. Install + verify the workspace
```
pnpm install --frozen-lockfile      # must exit 0
pnpm run typecheck                   # full typecheck across all packages
```

### 4. Confirm the live services are still up (they keep running)
```
curl -o /dev/null -w "%{http_code}\n" https://api.himewo.com/api/healthz   # 200
curl -o /dev/null -w "%{http_code}\n" https://himewo.com                    # 200
curl -o /dev/null -w "%{http_code}\n" https://admin.himewo.com             # 200
curl -o /dev/null -w "%{http_code}\n" https://himewo-mobile.pages.dev      # 200
curl -o /dev/null -w "%{http_code}\n" https://himewo-chat.pages.dev        # 200
```

### 5. Making changes after that
- **Edit code** in the workspace, then **push to GitHub `main`** via the REST API
  with `GITHUB_TOKEN` (git CLI is blocked) — see `himewo-github-push.md`.
- **API**: pushing to `main` auto-triggers a Railway build. Poll via the Railway
  GraphQL API (service id + queries in `himewo-deploy.md`).
- **Web / Admin**: build locally with the `VITE_*` env present, copy `dist/public`
  to `/tmp`, and run `wrangler pages deploy` from `/tmp` (see
  `himewo-cloudflare-pages-deploy.md`).
- **Mobile mirrors**: `expo export --platform web` then `wrangler pages deploy` to
  `himewo-mobile` / `himewo-chat` (see `himewo-preview-web-links.md`).

---

## EXTERNAL ACCOUNTS THE USER MUST OWN / HAVE ACCESS TO
These are NOT part of Replit and must be transferred or shared at the provider level:
- **GitHub** account `farhanayanemon-hub` (repo `himewo`).
- **Supabase** project ref `rzdfgbfyhnkvqbcegguk` (Postgres + Auth).
- **Railway** project `hospitable-nourishment` (api-server service).
- **Cloudflare** account (Pages projects `himewo`, `himewo-admin`, `himewo-mobile`,
  `himewo-chat` + DNS for himewo.com / admin.himewo.com).

If the user wants the new Replit account to control these too, they must log into
each provider and add the new account/owner there — Replit cannot transfer them.

---

## GOTCHAS (read the memory files for the full list)
- `pnpm` is pinned to `pnpm@10.26.1` in root `package.json` — Railway frozen install
  fails if this is removed.
- Supabase uses **ES256/JWKS** — do NOT set `SUPABASE_JWT_SECRET` on the API host or
  login breaks for everyone.
- `VITE_*` vars are baked in at **build time** — set them before building, not in the
  Cloudflare dashboard.
- The live API runs `NODE_ENV=production`, so `dev:<uuid>` tokens do NOT work there —
  log in with real credentials.
- Never `drizzle-push` against the live Supabase DB — apply schema changes additively
  via the Management API (`ALTER ... ADD COLUMN IF NOT EXISTS`).
