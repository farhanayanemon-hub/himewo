# HiMewo Chat

A standalone Messenger-style Expo mobile chat app (Banglish-friendly): login, conversation inbox, chat threads, stories, and voice/video calls — backed by a shared API server and Postgres.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — the Expo chat app (Messenger-style UI). Routes in `app/`: `(auth)/login`, `(tabs)/` (Chats inbox `index`, `people`, `menu`), `messages/[id]` (thread), `story/[id]`, `create-story`, `message-requests`, `archive`, `settings`.
- `artifacts/mobile/lib/api.ts` — wires API base URL (`EXPO_PUBLIC_DOMAIN`) and the auth token getter (Supabase session, or `dev:${id}` fallback).
- `artifacts/api-server/` — Express API mounted at `/api`; routes in `src/routes/`, seed in `src/seed.ts`.
- `lib/db/src/schema/` — Drizzle schema (source of truth for DB). `lib/api-spec/openapi.yaml` — API contract (run codegen after edits).

## Architecture decisions

- Chat-only product carved out of a full social-platform clone: social routes/components (posts, reels, groups, pages, profiles, search) were deleted; the messages inbox became the app root (`app/index.tsx`).
- Auth is optional: when Supabase isn't configured, the app uses seeded DEV_USERS with `dev:${id}` bearer tokens, so login works with no external setup.
- Realtime over a custom WebSocket (`/api/ws?token=`).
- Calls: `useCall().startCall(peer, withVideo)` from `components/CallProvider`. Engine is platform-split — `components/CallEngine.native.tsx` does REAL WebRTC voice/video over Stream Video (needs a native dev build), while `components/CallEngine.tsx` is a web/Expo-Go fallback (signaling overlay, no live media; also the file tsc resolves for `./CallEngine`). Both export a default `CallEngine` and provide `CallContext` from `components/callContext.ts`. Server mints Stream JWTs at `GET /api/calls/token` (`artifacts/api-server/src/routes/calls.ts`), signed with `STREAM_API_KEY`/`STREAM_API_SECRET`; returns 503 when unconfigured (client raises `CallsUnavailableError`).

## Product

HiMewo Chat is a dedicated mobile messaging app: pick/login as a user, browse the conversation inbox with stories at the top, open a thread to send messages with reactions and attachments, view/post stories, and start voice or video calls from a thread.

## User preferences

- User writes in Banglish; seed data and copy use Banglish/Bangla context.
- Wants a standalone chat app only — do NOT rebuild the full social platform or add a web artifact.

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before typechecking.
- Restart the `artifacts/api-server: API Server` workflow after route changes — the dev server builds at startup and won't pick up new routes otherwise (stale build returns 404s).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
