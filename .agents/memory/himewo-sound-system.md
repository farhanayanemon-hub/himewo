---
name: HiMewo app sounds
description: How client-side sounds (notification/message/comment/reaction/call) are wired in both Expo apps.
---

# HiMewo app sounds

Sounds are CLIENT-SIDE (like Facebook), not an admin-panel feature. Implemented with
`expo-audio` (`createAudioPlayer`), 5 WAV assets in each app's `assets/sounds/`.

## Architecture decision
- A single `lib/sounds.tsx` `SoundProvider` (identical in `artifacts/mobile` and
  `artifacts/mobile-chat`) preloads players and exposes `play(name)` + `startCallRing`/`stopCallRing`.
- Mounted between `RealtimeProvider` and `CallProvider` in each `app/_layout.tsx`.
- **Incoming-call ringtone is handled GLOBALLY in SoundProvider** by subscribing to realtime
  `call:offer`/`call:answer`/`call:end`/`call:reject` events — NOT inside CallEngine/CallProvider.
  **Why:** mobile-chat's `CallProvider` is a thin wrapper over a platform-split `CallEngine`
  (native Stream Video vs web fallback); handling ring in the provider keeps one code path that
  works for both apps and the web mirror without touching CallEngine internals.
- `message`/`notification` sounds also fire from the same realtime subscription; own messages are
  skipped via sender id. Ring has a 30s self-timeout so a missed call doesn't loop forever.
- **Reaction sound is FB(`artifacts/mobile`)-only** — mobile-chat has no feed ReactionBar.
- `useSounds()` returns a no-op fallback if the provider is missing, so components never crash.
- Web-export safe: all playback is `try/catch`ed and `setAudioModeAsync` is `.catch`ed (browser
  autoplay policy may block until first user gesture — degrades silently).
