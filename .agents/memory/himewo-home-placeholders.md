---
name: HiMewo home placeholders
description: Why the home Birthdays card and the Saved/Memories pages are intentional empty states, not bugs.
---

# HiMewo home / sidebar placeholders

The Home right-rail Birthdays card now shows REAL data — profiles have a `birthday`
date column, Edit Profile captures it, and `GET /api/birthdays` returns friends whose
month-day matches today (computed in Asia/Dhaka). The card only falls back to the
Banglish empty state when no friend has a birthday today.

Still intentional empty states (no backing data yet):

- **Saved:** there is no saved/bookmark table or endpoint yet; the page is a
  placeholder until save functionality is built (tracked as a follow-up).
- **Memories:** purely client-side empty state; no "on this day" data is computed.

**How to apply:** if asked to "fix" Saved/Memories looking empty, the real work is
adding the underlying feature (saved-items table / on-this-day query), not patching UI.
