---
name: PYMK suggestions
description: People You May Know ranking rules and contract shape.
---

# PYMK (People You May Know)

- `/users/suggestions` returns `FriendSuggestion[]` = `allOf [Profile, {mutualFriendsCount required}]` — Orval handles OpenAPI `allOf` fine (`Profile & {...}` intersection type), safe pattern for "Profile + extra fields" contracts.
- Ranking rules: exclude viewer + friends + PENDING friend requests in BOTH directions (else "Add Friend" button just fails); friends-of-friends counted from the undirected friendships table; rank by mutual count desc, top 10; backfill with random other users so brand-new accounts still see suggestions (backfill gets mutualFriendsCount 0).
- **Why** pending exclusion matters: suggestion surfaces must never offer an action the backend will reject.
- Locked-profile discoverability in suggestions is currently ALLOWED (same as search); revisit only if product decides locked accounts should be non-discoverable.
- Surfaces: friends page grid ("N mutual friends" line) + home right-rail `PeopleYouMayKnowRail` (top 3).
