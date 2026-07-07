---
name: Mentions + @highlight
description: How post/comment mentions and the special @highlight token work across web/mobile/API, and the visibility-gating rule for mention notifications.
---

# Mentions + @highlight

- Shared token: `@[Display Name](user:<uuid>)`. Special token `@[Highlight](user:highlight)` = notify ALL of the author's friends (Facebook-style).
- `activeMentionQuery` allows an EMPTY query (`{0,30}`) so a bare `@` opens the picker; callers must check `mentionQuery !== null` (empty string is valid, `&&` silently breaks it).
- Empty query → suggestion list shows the user's FRIENDS (useListFriends), non-empty → user search. The @highlight row is a pseudo-entry, not a Profile.
- Renderers (web `RenderWithMentions`, mobile `Mention.tsx`) must special-case id `highlight`: styled text, NO profile link (there is no /profile/highlight).

**Why:** users expected the friend list on bare `@` (FB behavior), and highlight fan-out is a notification-spam + privacy surface.

- Inputs must NEVER show the raw token (user saw `@[Highlight](user:highlight)` and reported it as a bug). Web pattern: input holds friendly `@Name` text, picked profiles tracked in a `mentionTargets` state array, `applyMentionTokens()` converts on submit — boundary-safe regex (`(^|\s)@Name(?=$|\s|[.,!?;:])`, escaped, longest-name-first) so partial edits stay plain text; duplicate display names fall back to raw-token insertion via `pickMention()`.

**How to apply:** POST /posts parses mentions server-side (comments route has its own copy). Rules: skip entirely when post is private or pendingApproval; visibility-gate recipients (group post → active members only; friends-only post → author's friends only); dedupe via Set, drop self, cap 500. Never notify someone who can't view the post — it leaks post existence.
