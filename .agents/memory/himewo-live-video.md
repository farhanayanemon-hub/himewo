---
name: Live video broadcast
description: One-to-many live streaming architecture — WebRTC over the app's own websocket, live rooms, security invariants.
---

# Live video broadcast

- Architecture: **no external media server**. Host holds one RTCPeerConnection per viewer (WebRTC mesh, host fan-out); signaling rides the existing app websocket (`live:*` message types) next to `call:*`. Fine for small audiences; a media server (SFU) is needed if streams grow beyond ~5-10 viewers.
- Server keeps in-memory `liveRooms` Map (hostId + viewer Set). Invariants:
  - `live:start` verifies host ownership against DB (stream active + hostId matches) — prevents room hijack.
  - `live:offer/answer/ice` relayed ONLY host↔registered-viewer inside the room; arbitrary point-to-point relay is not allowed for `live:*` (unlike `call:*`).
  - `live:chat` gated on room membership; display name enriched SERVER-side (never trust client-sent names); 500-char cap.
  - Host full-disconnect → server marks stream ended in DB + broadcasts `live:end` (rooms don't leak).
- REST: start auto-ends any stale active streams for that host (one live per host); end is host-only w/ generic 404.
- **Frontend lesson:** effects that own WebRTC lifecycle must NOT depend on the whole `useRealtime()` context object — its identity changes on every presence update, tearing down peers mid-stream. Depend on the stable `subscribe`/`sendSignal` callbacks (+ `connected` for re-join). A review failed the feature on exactly this.
