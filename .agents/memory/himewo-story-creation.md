---
name: Story creation + gallery-first media
description: Durable rules for HiMewo's FB-style media creation — story audience field and gallery-first entry behavior.
---

## stories.audience
- Field `public|friends|private` (default `public`), stored at creation but **not** enforced here — read-path filtering is the privacy task.
- **Two serializer paths must both emit it:** the single-story `toStory()` AND the feed `buildStoryGroups()`. `StoryEmbed` (message/story-reply embed) intentionally omits it. Miss either and `ListStoriesResponse.parse` fails → all story reads 500.
- **Why the live DB is fragile:** the serializer selects `audience` by name, so a live DB missing the column breaks every story *read*, not just create. Apply additively before deploy: `ALTER TABLE stories ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'public';` via Supabase Mgmt API. Never drizzle-push to live.

## Gallery-first entry (FB behavior)
- **Rule:** a media-intent entry point opens the device picker immediately; a text-intent entry point does not.
- Reel: entry is always media → picker auto-opens on mount, cancel-with-nothing → `router.back()`.
- Post: the composer row (text) opens the plain composer; the green photo icon routes with a `media` param so the picker auto-opens on mount (cancel just leaves you on the composer, since text is still valid).
- Story: stays pick-button-first because it also has a Text mode; auto-opening the gallery would fight the text-story path.
- **Pattern:** guard the auto-open with a `useRef` so it fires once, keyed off the route param.
