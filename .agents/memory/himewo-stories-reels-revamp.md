---
name: Stories/Reels revamp (reactions, reply-to-DM, reel music)
description: Durable design facts for FB-style story reactions, story-reply-to-DM, story embeds in messages, and reel music serialization.
---

# Stories / Reels revamp

## Stories are PUBLIC — no visibility gate, only an expiry gate
`buildStoryGroups` has NO friend/visibility filter — it returns every non-expired
story to any authenticated viewer (same public model as the events board).
**How to apply:** story interaction routes (reaction PUT/DELETE, reply) must NOT
add friend-gating (there is nothing to gate against), but they MUST reject
interaction with EXPIRED stories (`expiresAt < now → 404`), because expired
stories drop out of the feed and interacting by direct ID would otherwise be a
stale-interaction leak. DELETE-reaction may stay lenient (un-react is harmless).

## Reel music (and any new persisted col) must be added to buildReels output
`POST /reels` persisted `musicUrl/musicTitle/musicArtist` but `buildReels`
omitted them, so every reel endpoint silently dropped the music metadata even
though it was in the DB. Client type had the fields optional, so typecheck stayed
green and the omission was invisible.
**Why:** all reel responses (list/get/create) funnel through `buildReels`/`buildReelById`.
**How to apply:** whenever you add a schema column that clients read, add it to
the serialize map object too — the serialize-omission is a silent class of bug the
typechecker will NOT catch when the client field is optional.

## Story reply → Direct Message
Reply route uses `lib/conversations.ts::findOrCreateDirectConversation` (mirrors
the `/conversations` route dedupe; non-transactional, race-prone like the existing
design — acceptable, inherited) then inserts a message with `messages.storyId` set.
`buildMessages` loads `storyId → StoryEmbed` so chat app / web render the story
preview ABOVE the message. Embed serialization must tolerate expired/deleted
stories (return null embed, not throw).

## Music auto-share
Posting a story/reel with music calls exported `shareMusicToLibrary` so the track
lands in the seeded music library (12 tracks seeded on both dev via executeSql and
live via Supabase Mgmt API).
