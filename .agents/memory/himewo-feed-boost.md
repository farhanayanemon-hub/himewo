---
name: New-user feed boost
description: How the home feed hoists requested-friends + top-page posts for new users without breaking id-cursor pagination.
---

# New-user feed boost (home /feed)

- When viewer has < 5 friends, personal mode, FIRST page only (no cursor): hoist recent PUBLIC posts from outgoing-pending friend-request targets + posts from top-5 pages (by follower count, left join so 0-follower pages rank). Existing users (≥5 friends) and page-mode feeds untouched.
- **Cursor contract:** both clients use the LAST returned post id as the next cursor. Any hoisted/reordered content must sit BEFORE the chronological tail, and the page's last element must stay chronological — cap boosted at `min(floor(limit/2), limit-1)` so at least one chronological slot always remains (limit=1 ⇒ no boost).
- Boosted candidates: privacy='public' only (requested users are NOT friends yet — friends/private must never leak), pendingApproval=false, groupId null, not viewer's own, then still run through `filterVisiblePosts` (lock/only_me apply). Mix cap 2 per author/page.
- Chronological scan excludes boosted ids (in-page dedupe). Cross-page dupes (old boosted post reappearing at natural spot) are handled CLIENT-side: both feeds dedupe accumulated posts by id.
- **Web gotcha:** next cursor must come from the RAW last fetched page, not the deduped render list, or an all-duplicate page stalls pagination on the same cursor.
