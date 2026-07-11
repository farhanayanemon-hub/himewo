---
name: Page & group invites + follower/following lists
description: Invite-friends flows for pages and groups, private-group approval bypass, and page follower/following list endpoints — with the anti-spam friend gate.
---

# Page & group invites

Two invite tables in `communities.ts`: `pageInvitesTable`, `groupInvitesTable`;
`page_invite` notification enum in `enums.ts`.

## Anti-spam friend gate (critical)
Both invite endpoints (`POST /pages/:id/invite`, `POST /groups/:id/invite`)
MUST filter `inviteeIds` down to the caller's **accepted friends** via
`getFriendIds()` in `authz.ts`. **Why:** invitee IDs are client-supplied UUIDs;
without the gate any user could spam-invite arbitrary strangers by guessing IDs.
Non-friends are silently skipped, not errored.

## Other invariants
- Page invite skips users who already follow the page (dedupe) AND non-friends.
- Group join route consumes a matching invite row; an invitee joining a PRIVATE
  group bypasses the normal approval queue (invite = pre-approval).
- `GET /groups/invites` route MUST be registered BEFORE `/groups/:id` or Express
  matches "invites" as an id.
- Decline (`POST /groups/:id/invite/decline`) just deletes the invite row.

## Frontend
- Page profile: Followers/Following counts are clickable → member/profile lists;
  3-dot menu has "Invite friends". Web `pages.tsx`, mobile `pages/[id].tsx`.
- Groups: invite-friends modal + "my pending invites" list w/ decline; web
  `groups.tsx`, mobile `groups/[id].tsx` + `groups/index.tsx`.
- "Create Group" entry points added on both Page profile and user Profile.
- Generated hooks: `useListPageFollowers/Following(id)`, `useListGroupInvites()`,
  `useInviteToPage/Group({id,data:{userIds}})`, `useDeclineGroupInvite({id})`.

## Test
`artifacts/api-server/src/routes/invites.test.ts` seeds real friendships
(canonical pair `userAId<userBId`) so the friend gate passes; includes a
non-friend "stranger" that must be skipped.
