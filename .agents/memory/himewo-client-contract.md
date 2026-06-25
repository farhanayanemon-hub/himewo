---
name: HiMewo client auth & realtime contract
description: How HiMewo clients (web, mobile) authenticate, do realtime, and upload media against the shared backend.
---

The shared backend is env-driven: real Supabase Auth/Storage in production, a dev fallback otherwise. Clients must work in BOTH modes.

## Auth
- **Dev fallback (no Supabase env)**: backend accepts a bearer token `dev:<uuid>` (or header `x-dev-user-id`). 8 seeded users have fixed UUIDs `00000000-0000-4000-8000-0000000000NN` (N=1..8): ahnaf, mim, rifat, tania, shuvo, nusrat, tanvir, shara. Clients show a quick-login picker over these in dev.
- **Production**: real Supabase Auth (email/password, Google OAuth, phone OTP). Client sends the Supabase session access_token as the bearer.
- **Wiring**: the request layer (`@workspace/api-client-react` `setAuthTokenGetter`) returns the Supabase session token when configured, else `dev:<localStorage id>`. New Supabase users must POST `/auth/sync` (id, username, displayName, email) to create the app profile before `/auth/me` succeeds.
- **Why**: lets the app run fully in the Replit dev DB without any Supabase secrets, then switch to Supabase purely via env vars at deploy (Railway/Expo) with no code change.

## Realtime
- WS endpoint is the api-server path `/api/ws?token=<same bearer>`. It is covered by the api-server's `/api` route prefix — do NOT add a separate WS path to the web artifact's `paths`.
- Server→client events: `connected`, `presence{userId,status}`, `message{conversationId,message}`, `message_deleted`, `seen`, `typing`/`stop_typing`. Client→server: `typing`/`stop_typing`/`seen`, and WebRTC `call:offer|answer|ice|end|reject` (relayed to `to`, arrive with `from`).
- On `message`/`message_deleted`, invalidate listMessages + listConversations query keys to update live.

## Media upload
- `POST /media/upload-url` ({fileName, contentType?, bucket?}) → {uploadUrl, publicUrl, path}. Client PUTs raw bytes to uploadUrl, then stores publicUrl.
- **Dev returns HTTP 503** (storage unconfigured) — clients must degrade gracefully (allow text-only posting and URL-paste fallback), not block.

**How to apply**: reuse this exact contract for the Expo mobile app and the standalone Messenger clients. The web app's `src/lib/{supabase,auth,realtime,api}.ts(x)` are the reference implementation.
