---
name: Chat app in-app chat heads
description: Messenger-style chat heads in mobile-chat — in-app only (banner + draggable bubble); OS-level heads need native build
---

# Chat heads (mobile-chat)

`components/ChatHeads.tsx`, mounted in `app/_layout.tsx` inside CallProvider
(needs RealtimeProvider + AuthProvider above it).

- Subscribes to realtime `message` events; ignores own messages
  (senderId ref) and the currently open conversation (usePathname kept in a
  ref — handlers are long-lived, plain state would go stale).
- Shows: top banner (auto-hide 4s, tap→open) + draggable chat-head bubble
  with unread count; drag to bottom close-zone dismisses; snaps to nearest
  horizontal edge; Dimensions change listener re-clamps position after
  rotation/resize.
- Uses RN built-in Animated + PanResponder (NOT reanimated — worklets plugin
  not wired in these apps).

**Why in-app only:** true OS-level chat heads / push while the app is closed
require a native Android build (SYSTEM_ALERT_WINDOW overlay + FCM push).
The web mirrors (Cloudflare Pages) and Expo preview cannot do this — user
was told honestly; revisit if a Play Store native build ever happens.
