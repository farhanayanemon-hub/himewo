---
name: Comment replies & mentions
description: Threading model and mention token contract for HiMewo comments (web + mobile + API).
---

# Comment replies & @mentions

## Threading model
- One-level threads (Facebook style). Server FLATTENS reply-to-a-reply onto the
  top-level parent (`parentId = parent.parentId ?? parent.id`) — clients must
  also send `parentId: comment.parentId ?? comment.id` when replying to a reply.
- Server validates: parent must exist AND belong to the same post, else 400.
- **Why:** deep nesting was never designed for in the schema/UI; flattening keeps
  rendering a simple two-level `topLevel` + `repliesByParent` map on all clients.

## Mention token contract (shared web + mobile + API)
- Token format in comment content: `@[Display Name](user:<uuid>)`.
- Parse regex: `/@\[([^\]]+)\]\(user:([^)]+)\)/g`.
- Server side: extracted ids are UUID-regex-guarded BEFORE the profiles lookup
  (profiles.id is uuid — non-uuid input would make Postgres throw / 500), max 10,
  dedup, skips self + post author + parent author (they already get "comment"
  notifications), creates `type:"mention" entityType:"post"` notifications only
  for profiles that exist.
- **How to apply:** if mentions are added to another surface (posts, reels),
  reuse the same token format + the same UUID guard; helpers live in
  `web/src/components/mention.tsx` and `mobile/components/Mention.tsx`.

## Gotcha
- Generated `useSearchUsers` (and other orval hooks) require an explicit
  `queryKey` when you pass a `query` options object — use
  `getSearchUsersQueryKey(params)` or typecheck fails TS2741.
- Fresh /tmp clone: the vitest harness DB may be EMPTY (relation "profiles"
  does not exist) — run `pnpm --filter @workspace/db run push-force` once
  before running route tests.
