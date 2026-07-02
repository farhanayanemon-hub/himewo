---
name: Feeling/activity + check-in
description: How the "feeling/activity" and "check-in location" post fields are modeled and rendered across composer and post card.
---

# Feeling/activity + check-in

Posts carry four nullable text columns: `feeling_verb`, `feeling`, `feeling_emoji`, `location`.

**Model:** a selection is `{ verb, label, emoji }`. Feelings use verb="feeling" (e.g. `feeling happy 😊`); activities use their own verb (e.g. `watching a movie 🎬`, `praying 🤲` with empty label). Location is free text only — no maps/geo DB.

**Composer** (post-composer.tsx): FEELINGS[] + ACTIVITIES[] constants, a two-tab picker panel (feelings/activities) with search, plus a check-in text input. On submit it sends `feelingVerb`/`feeling`/`feelingEmoji`/`location` (all `|| undefined`). An empty label is allowed (send `feeling?.label || undefined`) — don't send a `" "` placeholder.

**Render** (post-card.tsx): after author name, show `is {emoji} {verb} {label}` and/or `<MapPin/> at {location}`. Guard each half with `(feelingVerb || feeling)` and `location` independently — a post can have only one.

**Why:** mirrors Facebook feeling/activity + check-in without geo infra; keeping location as plain text avoids a places table.
