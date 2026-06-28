# HiMewo

HiMewo is a Facebook-style, Banglish-friendly social platform with three client apps backed by a shared API server and Postgres:

- **Web** (`artifacts/web`) — the social website (feed, posts, reels, stories, groups, pages, profile, friends, notifications, messages).
- **Mobile main app** (`artifacts/mobile`) — the full social Expo app (mobile version of the website).
- **Messenger** (`artifacts/mobile-chat`) — a dedicated Messenger-style chat Expo app (inbox, threads, stories, voice/video calls).

Think Facebook + Messenger: the website and the main mobile app are the social platform; HiMewo Chat is the standalone messenger.

## Run & Operate

- `pnpm --filter @workspace/web run dev` — social website
- `pnpm --filter @workspace/mobile run dev` — main social mobile app (Expo, port 18115, preview `/mobile`)
- `pnpm --filter @workspace/mobile-chat run dev` — Messenger app (Expo, port 18116, preview `/mobile-chat`)
- `pnpm --filter @workspace/admin run dev` — admin panel
- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web/Admin: React + Vite. Mobile: Expo / React Native (expo-router)
- API: Express 5. DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`. API codegen: Orval (from OpenAPI spec)
- Auth/data backend: Supabase (ES256/JWKS). Realtime over a custom WebSocket (`/api/ws?token=`).

## Where things live

- `artifacts/web/` — social website (pages in `src/pages/`: home, post, reels, stories, groups, pages, profile, friends, notifications, messages, search, settings).
- `artifacts/mobile/` — full social Expo app. Routes in `app/`: `(auth)/login`, `(tabs)/` (home feed, friends, reels, notifications, menu), `create-post`, `create-reel`, `create-story`, `post/[id]`, `profile/[id]`, `groups/`, `pages/`, `search`, `messages/`, `story/[id]`, `settings`.
- `artifacts/mobile-chat/` — Messenger-style chat Expo app. Routes in `app/`: `(auth)/login`, `(tabs)/` (Chats inbox, people, menu), `messages/[id]`, `story/[id]`, `create-story`, `message-requests`, `archive`, `settings`.
- `artifacts/admin/` — admin panel. `artifacts/api-server/` — Express API mounted at `/api` (routes in `src/routes/`, seed in `src/seed.ts`).
- `lib/db/src/schema/` — Drizzle schema (source of truth for DB). `lib/api-spec/openapi.yaml` — API contract (run codegen after edits).
- Both mobile apps: `lib/api.ts` wires the API base URL (`EXPO_PUBLIC_DOMAIN`) + auth token; `lib/supabase.ts` flips real login on when `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set.

## Architecture decisions

- Three clients share one API + one Supabase project, so users and data sync across web, main mobile app, and Messenger.
- Live dev preview: each Expo app's `package.json` `dev` script maps the live secrets (`VITE_API_URL` → `EXPO_PUBLIC_DOMAIN` with the scheme stripped, plus `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) so the preview talks to the live backend instead of demo mode. See memory `himewo-live-connection.md`.
- Auth via Supabase (ES256/JWKS). Live (Railway) backend runs `NODE_ENV=production`, so `dev:<uuid>` tokens do NOT work there — log in with real credentials.
- Calls: `useCall().startCall(peer, withVideo)`. Engine is platform-split — `CallEngine.native.tsx` does real WebRTC over Stream Video (needs a native dev build); `CallEngine.tsx` is the web/Expo-Go fallback. Server mints Stream JWTs at `GET /api/calls/token`; returns 503 when unconfigured.

## Product

HiMewo lets users post, react, comment, share, watch/post reels and stories, join groups and pages, add friends, get notifications, and chat. The main mobile app mirrors the website; HiMewo Chat is the focused messaging experience with voice/video calls.

## User preferences

- User is non-technical and writes in Banglish — reply in simple Banglish. Seed data and copy use Banglish/Bangla context.
- NOTHING gets deleted. Keep everything correctly named (folder/title must match purpose).
- Keep the three-app model: Web (social) + Mobile (social main app) + Messenger. The two mobile apps are different products — do not let them collapse into one.
- Keep GitHub (`github.com/farhanayanemon-hub/himewo`) in sync.
- ALWAYS auto-sync after finishing work — push to GitHub AND deploy/make live — without asking each time. The user wants every completed change to land live by default.

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before typechecking.
- Restart the `artifacts/api-server: API Server` workflow after route changes (stale build returns 404s).
- Both Expo apps share one Replit Expo preview domain (`$REPLIT_EXPO_DEV_DOMAIN`), so the canvas/screenshot can only show one at a time — verify the other via its workflow log, not a second screenshot.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Memory: `himewo-live-connection.md` (live-connect method + auth contract), `himewo-two-mobile-apps.md` (the two mobile apps + restore history).
