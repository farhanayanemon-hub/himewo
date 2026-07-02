---
name: HiMewo poll posts
description: How poll posts work (create/vote/results) and the integrity/privacy invariants to preserve.
---

# HiMewo poll posts

A post can carry ONE optional poll (separate `poll.question` from `post.content`; content is an optional caption). Poll = question + 2–6 options.

## Invariants (must preserve)
- **One vote per poll per user** — enforced by unique index `poll_votes_poll_user_uniq` on `(pollId, userId)`; vote change = upsert on conflict, remove = delete.
- **Option-belongs-to-poll guard** — the vote route rejects an `optionId` that isn't an option of that post's poll (prevents cross-poll vote injection).
- **Privacy** — poll vote/remove routes are gated by `canViewPost` (same visibility rule as the post). Never let a user vote on a poll they can't see.
- **One poll per post** — unique index `polls_post_uniq` on `postId`.

## Serialize / results
- `buildPosts` attaches `poll` to each post: options with `voteCount`, `totalVotes`, and `viewerVotedOptionId` (null if not voted). Frontend renders % = voteCount/totalVotes, shows results + change/remove once voted.

## Codegen note
- Vote endpoints are **path-only** (`PUT`/`DELETE /posts/{id}/poll/vote`, body only) — so NO manual `*Params` barrel re-export needed in `lib/api-zod/src/index.ts` (contrast the path+query rule in himewo-api-zod-codegen.md).
