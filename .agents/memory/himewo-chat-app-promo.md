---
name: Main app pushes chat to the Chat app
description: The main social app (artifacts/mobile) has NO in-app messaging — it funnels every chat entry point to an animated promo that opens the dedicated HiMewo Chat app (Facebook→Messenger pattern).
---

# Main app → HiMewo Chat app (no in-app chat)

**Decision:** `artifacts/mobile` (the Facebook-style social app) does NOT host messaging.
Every chat entry point lands on an animated promo page that pushes users to the dedicated
`artifacts/mobile-chat` (Messenger-style) app. The web mirror and the chat app keep real chat.
**Why:** mirrors Facebook removing chat into Messenger; one chat codebase, not two.

## How it's wired
- `app/messages/index.tsx` IS the promo page (animated hero + feature list + smart CTA). It is
  NOT a conversations list anymore. All entry points already `router.push("/messages")`
  (home header chat icon, menu, notifications, friends), so they all land here.
- `app/messages/[id].tsx` = `<Redirect href="/messages" />` — any deep-linked thread bounces
  to the promo (no chat thread UI reachable in the main app).
- profile/[id] `onMessage` and marketplace/[id] `onMessageSeller` just `router.push("/messages")`
  (they no longer create a conversation). `useCreateConversation` left imported/declared but
  unused (noUnusedLocals is false) — harmless.

## Smart CTA button logic
- Constants: `CHAT_SCHEME = "mobilechat://"` (chat app's scheme from its app.json),
  `CHAT_WEB_URL = "https://himewo-chat.pages.dev"`, `PLAY_STORE_URL` = play listing.
- web → `globalThis.open(CHAT_WEB_URL, "_blank")` (Linking.openURL fallback).
- native + installed (`Linking.canOpenURL(CHAT_SCHEME)`) → open the app scheme → label "Open App".
- native + not installed → open Play Store → label "Get App Now".

## TODO when chat app is published
The chat app's `android` block in `artifacts/mobile-chat/app.json` is EMPTY — no real package
id / Play Store listing yet. `PLAY_STORE_URL` uses placeholder `com.himewo.chat`. Set the real
android package + publish, then update `PLAY_STORE_URL`. Until then native install falls back to
the web chat. **Animations use React Native's built-in `Animated`, NOT reanimated** — see the
reanimated note below.
