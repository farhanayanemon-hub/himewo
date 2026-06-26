# HiMewo

HiMewo is a Banglish Facebook-like social platform: feed/posts, comments, reactions, friends, groups, pages, stories, reels, real-time messaging, and (planned) large-video upload + livestreaming. The UI copy is Banglish (Bangla written in English). No emojis in UI chrome.

## Read this first if you just received this project (transfer / new account)

The Agent chat history does NOT transfer between accounts — but this file, the code, and `.agents/memory/` do. This section is the handover. Read it, then read `.agents/memory/MEMORY.md` and the topic files it links.

### What is already built and working
- **Backend** (`artifacts/api-server`): Node.js + Express + TypeScript REST API + WebSocket realtime. Auth, posts, comments, reactions, friends/requests, groups, pages, conversations/messages, stories, reels, notifications, media upload-url endpoint. Authorization model in `src/lib/authz.ts`.
- **Database** (`lib/db`): PostgreSQL + Drizzle ORM. Schema for profiles, posts, comments, friendships, friend_requests, groups, group_members, pages, conversations, messages, stories, reels, notifications. Runs on the Replit built-in Postgres in dev (`DATABASE_URL` is set).
- **Web app** (`artifacts/web`): React + Vite + TypeScript, wouter router, Shadcn UI + Tailwind. Calls the backend via `@workspace/api-client-react`.
- **Mobile app** (`artifacts/mobile`): Expo (React Native).
- **API contract**: `lib/api-spec/openapi.yaml` is the source of truth. Client hooks/Zod are generated via Orval into `lib/api-client-react`.
- A standalone chat-app starter bundle was exported to `exports/himewo-chat-starter.tar.gz` (the platform allows only ONE Expo app per project, so the separate chat app is meant to be built in its own Replit project from this bundle).

### What is NOT done yet (pending work)
- **Admin panel** (Facebook-style): planned as a NEW separate web artifact `artifacts/admin` (react-vite + shadcn, `/admin` path, same backend). Planned pages: dashboard/stats, user management (verify/ban/delete/make-admin), content moderation, reports queue, groups & pages management, and a Settings/Integrations page. Required schema additions: `isAdmin` + `isBanned`/`bannedAt` on `profiles`, an encrypted `app_settings` table, and a `reports` table. Needs a `requireAdmin` middleware and a `make-admin <userId>` script for the first admin. **Decision: the admin Settings page is where the owner will paste the Cloudflare Stream credentials** (stored encrypted in `app_settings`, encrypted using the existing `SESSION_SECRET`), instead of as env secrets.
- **Large video upload + livestreaming (broadcast, Facebook-Live style)**: provider chosen = **Cloudflare Stream** (live ingest + transcoding + adaptive HLS + CDN + auto-recording to VOD, all in one). No Replit one-click integration exists, so credentials come from the admin Settings page (or env). Backend needs: read provider config from `app_settings`, create live inputs, handle VOD uploads, store stream UIDs (add a `live_streams` table + extend `reels`/posts to reference Cloudflare UIDs). Apps need: "Go Live" flow + HLS player + live chat (reuse the existing WebSocket). Live chat does NOT need a new system.
- **Supabase for production**: dev currently uses a dev-auth fallback and returns 503 for media upload (no storage configured). For real accounts + (non-video) media storage, provision a Supabase project and set its env vars (see below). DB/Auth/Storage can all come from one Supabase project.

### Setup required in a new account after transfer (none of this copies automatically)
1. **Secrets / env vars** — re-add. Currently present (must be recreated): `SESSION_SECRET`, `DATABASE_URL` (+ `PG*`). When enabling production features also add Supabase vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_STORAGE_BUCKET`) and Cloudflare Stream creds (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`) — or enter Cloudflare creds via the admin Settings page once built.
2. **Database data** — the Replit Postgres data does NOT move. Either start fresh (run `pnpm --filter @workspace/db run push` then the seed) or migrate via `pg_dump` from the old project and restore into the new one.
3. **GitHub** — repo is `github.com/farhanayanemon-hub/himewo`. Cleanest transfer path is: push everything, then in the new account Create Repl → Import from GitHub. Verify all commits are pushed (there has been an unpushed commit before).
4. **Deployment** — re-publish in the new account.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web run dev` — run the web app
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + WebSocket (`ws`) for realtime
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Web: React + Vite + wouter + Shadcn UI + Tailwind
- Mobile: Expo (React Native)
- Build: esbuild (CJS bundle) for the API server
- Auth/Storage (prod): Supabase. Video/livestream (planned): Cloudflare Stream.

## Where things live

- API server: `artifacts/api-server/src` (routes in `src/routes`, auth in `src/lib/auth.ts`, authorization in `src/lib/authz.ts`, env in `src/lib/env.ts`, storage in `src/lib/supabase.ts`, media in `src/routes/media.ts`)
- DB schema (source of truth): `lib/db/src/schema/*`
- API contract (source of truth): `lib/api-spec/openapi.yaml`
- Generated API client: `lib/api-client-react/src`
- Web app: `artifacts/web/src` (`src/lib/{api,auth,supabase,realtime}.ts(x)` are the reference client wiring)
- Mobile app: `artifacts/mobile`
- Chat starter bundle: `exports/himewo-chat-starter.tar.gz`

## Architecture decisions

- The backend is env-driven: real Supabase Auth/Storage in production, a dev fallback (dev:<uuid> token / `x-dev-user-id` header / `DEV_USER_ID`) otherwise — so the whole app runs in the Replit dev DB with no Supabase secrets, then switches to Supabase purely via env at deploy.
- Read-by-id endpoints mask non-visible resources as 404 (not 403) to avoid existence leakage. Every post/comment/conversation read-or-mutate-by-id endpoint must gate on the helpers in `authz.ts`.
- Media upload uses a signed-upload-URL → public-URL pattern (S3-compatible), which makes swapping storage providers straightforward.
- Video/livestream will use one provider (Cloudflare Stream) for both live and VOD; live chat reuses the existing WebSocket rather than a new service.
- Admin-managed integration credentials (Cloudflare) are stored encrypted in an `app_settings` table (encrypted with `SESSION_SECRET`) and entered via the admin panel, instead of env secrets.

## Product

Banglish Facebook-like social network: posts/feed with reactions and comments, friends and friend requests, groups, pages, stories, reels, real-time direct/group messaging with presence/typing/seen and WebRTC call signaling, notifications. Planned: large-video upload and broadcast livestreaming with live chat, plus an admin panel.

## User preferences

- UI copy is Banglish; no emojis in UI chrome.
- Communicate in Banglish.
- Video/livestream provider preference: Cloudflare Stream (chosen for cost + combined live+VOD+CDN).
- Cloudflare credentials to be entered via the admin panel Settings page, not as env secrets.

## Gotchas

- There is no `tsx`. One-off scripts (seed, etc.) are bundled by `build.mjs` (esbuild entryPoints) and run via `node dist/<name>.mjs`.
- Codegen zod naming per operation: path params `<Op>Params`, query `<Op>QueryParams`, body `<Op>Body`, response `<Op>Response`.
- The WebSocket lives under the api-server `/api` prefix at `/api/ws?token=<bearer>` — do NOT add a separate WS path to the web artifact paths.
- Media upload returns HTTP 503 in dev (storage unconfigured) — clients must degrade gracefully (allow text-only + URL-paste), not block.
- The platform allows only ONE Expo (mobile) app per project.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- See `.agents/memory/MEMORY.md` and its linked topic files for deeper non-obvious conventions.
