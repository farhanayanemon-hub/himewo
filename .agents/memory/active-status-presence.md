---
name: Active-status presence privacy
description: How HiMewo's "Active status" toggle stays private across WS connect/reconnect
---

# Active-status presence must be client-driven, not connect-driven

The realtime WebSocket server must NOT broadcast a user as `online` on socket
connect. Presence is published only after the client sends a `presence:set
{visible}` message. The server marks new sockets `invisible` until then.

**Why:** If the server sets `online` + broadcasts on connect, a user who has
"Active status" turned off still leaks an online ping on every connect/reconnect
(and on cold start before AsyncStorage hydration). That defeats the privacy
control. Found in code review of the Messenger redesign.

**How to apply:**
- Client gates the WS connection on preferences being hydrated (`ready`) so the
  first `presence:set` reflects the stored toggle, not the default-true value.
- Client sends `presence:set` on `onopen` and again whenever `activeStatus`
  changes (guard stale closures with a ref).
- Presence shown in the friends list comes from `presenceTable` (status +
  lastSeenAt) joined in the friends route — it is NOT part of the base profile
  serializer. Live online dots come from presence broadcasts on the client.
