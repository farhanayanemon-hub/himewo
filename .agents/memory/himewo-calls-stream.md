---
name: Audio/video calls (Stream Video)
description: How 1:1 voice/video calling works across HiMewo surfaces and why web and mobile calls must both ride Stream Video to interoperate.
---

# Audio/video calls — Stream Video

1:1 calling is powered by **Stream Video (getstream.io)**, NOT the app's own
websocket. Both the web app and the mobile **chat** app connect to the SAME
Stream app, so a call started on one rings on the other and connects.

- **Credentials:** minted server-side at `GET /api/calls/token` (api-server
  `routes/calls.ts`, `requireAuth`, HS256 JWT via `jose`). Client gets
  `{ apiKey, token, userId }`. Returns **503** when Stream isn't configured.
- **Stream keys (`STREAM_API_KEY`/`STREAM_API_SECRET`) live on Railway (prod)** — set
  2026-07-16 via Railway GraphQL `variableUpsert` + `serviceInstanceRedeploy` (they had
  been MISSING on prod → token route 503'd; verified 200 afterward with a temp Supabase
  user JWT, then deleted the user). Also now present as Replit secrets. Dev api-server
  still lacks them in env wiring, so dev `/api/calls/token` may 503. But web dev
  uses `VITE_API_URL=https://api.himewo.com` (prod API), so the dev web client can
  still get real Stream creds. `isCallsConfigured()` gates the 503.
- **Web:** `artifacts/web/src/components/call-provider.tsx` uses
  `@stream-io/video-react-sdk` (`StreamVideo` + `StreamCall` + `RingingCall` /
  `SpeakerLayout`+`CallControls` driven by `useCallStateHooks`). Creds fetched via
  `src/lib/calls.ts`. `useCall().startCall(peer, withVideo)` is the caller contract
  (messages.tsx). **The client effect MUST depend on `user?.id`, not the whole
  `user` object**, or a profile refresh tears down an in-progress/ringing call.
- **Mobile chat native build:** `mobile-chat/components/StreamCallEngine.tsx`
  (`@stream-io/video-react-native-sdk`). Expo Go / web preview falls back to
  `CallEngineFallback.tsx` (UI only, no real media). Main HiMewo mobile app has a
  vestigial CallProvider stub — no screen actually calls it (chat lives in the chat app).

**Why this matters:** web previously used a hand-rolled WebRTC-over-app-socket path
(STUN only, no TURN) that could NEVER connect to the chat app's Stream calls — two
disjoint systems. Migrating web to Stream unified them. If you touch calling, keep
BOTH platforms on Stream; don't reintroduce raw WebRTC on one side.
