---
name: Profile contact privacy
description: How email/phone are gated in profile serialization, and a map() footgun with the contact flag
---

# Profile contact info (email/phone) is self-only

`toProfile(row, includeContact = false)` in `artifacts/api-server/src/lib/serialize.ts` nulls out
`email` and `phone` unless `includeContact` is true. `buildProfileDetail(userId, viewerId)` passes
`includeContact = viewerId === userId`, so contact info is only returned on a viewer's own profile
(getCurrentUser / login). All other profile payloads (getUser of others, search, friend suggestions,
friends list, story viewers, reel authors) call plain `toProfile` and get `email/phone = null`.

**Why:** A profile redesign surfaced email/phone in the Intro card on web + mobile. The serializer
returned them for everyone, so any authenticated user could read another user's contact info — a PII
leak. Gating at the serializer (not just hiding in the UI) is the real fix.

**How to apply:** Never expose email/phone for non-self profiles. If a new endpoint must show contact
info, pass `includeContact` only after confirming the requester is the owner (or has explicit consent).

## Footgun: `array.map(toProfile)`
Because `toProfile` now takes a second arg, `rows.map(toProfile)` passes the **array index** as
`includeContact` (1, 2, 3… → truthy), which would leak contact info AND fails typecheck. Always wrap:
`rows.map((r) => toProfile(r))`.
