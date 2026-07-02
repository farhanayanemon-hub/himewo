---
name: Events + RSVP
description: Events feature scope decisions — public board model, RSVP semantics, ordering.
---

# Events + RSVP

- Tables `events` + `event_rsvps` (unique eventId+userId; status text enum going/interested/declined). Routes in `routes/events.ts`, pages `/events` + `/events/:id`, sidebar shortcut.
- **Design decision: events are a PUBLIC board** — every logged-in user sees all events (no friend-gating), unlike albums/posts. **Why:** matches a community events board; revisit if user asks for private/invite-only events.
- RSVP is an upsert; clicking your current status again clears it (DELETE rsvp). All three statuses must be exposed in UI — a review failed the feature once for missing "Can't go" (declined).
- List ordering: upcoming soonest-first, then past most-recent-first via `CASE WHEN starts_at >= now()` sort keys.
- No notifications for events yet (avoided enum migration; use mention+entityType pattern from albums if needed later).
