---
name: Story viewer (FB-style)
description: How the web & mobile story viewers open, time, and navigate; the deliberate web/mobile entry asymmetry.
---

# Story viewer behavior

Both viewers reuse backend fields already on the contract: per-story `viewerHasViewed`
and per-group `hasUnseen` (no backend/contract change needed for the viewer).

## Durations
- Photo / text stories: 15s. Video: up to 30s.
- Video shorter than the cap advances early: mobile via expo-video `playToEnd`
  listener (`loop=false`), web via `<video onEnded>` (no `loop`).

## Navigation model (mirrors Facebook)
- **Tap** advances WITHIN a person (left/right tap zones).
- **Swipe horizontally** changes PERSON (author), landing on that person's first
  unseen story. Mobile uses a `PanResponder` wrapping the tap `Pressable`s
  (`onMoveShouldSetPanResponder` only claims clear horizontal drags so taps still
  reach the Pressables); web uses touch start/end dx + desktop chevrons + ←/→ keys.

## Entry asymmetry — DELIBERATE, not a bug
- **Mobile** (`artifacts/mobile/app/story/[id].tsx`) is entered by tapping a
  specific person's ring (StoryBar passes that group's first story id). So it
  anchors to THAT person's group, then opens their first unseen story.
- **Web** (`artifacts/web/src/pages/stories.tsx`) is entered generically via
  `/stories` (no id), so it scans `groups.findIndex(g => g.hasUnseen)` and opens
  the first person with unseen content, at their first unseen story.
- **Why:** matches how each platform is entered. A code reviewer may flag mobile
  for "not global unseen-first" — that is intended. Don't "fix" it to scan globally.

## Gotchas
- Keep latest nav closures in a ref for the once-created PanResponder / event
  listeners to avoid stale closures.
- Restart the web active-segment CSS fill by keying the fill div on `activeStory.id`
  (keyframe `himewoStoryFill`, width 0→100% over the story duration).
- reanimated is NOT wired in artifacts/mobile — use RN `Animated`/`PanResponder`.

## Earlier viewer facts (still true)
- Mobile cross-group position must be set ONCE (positionedRef) — background
  refetch otherwise snaps the viewer back to the start.
- Single source-of-truth auto-advance timer only (two competing animations caused
  skip / double-advance).
- Own story: hide the reply UI — replying to your own story 400s ("Could not send").
- A delete-story endpoint was added (none existed originally).
- Mobile tap zones stop at bottom:190 so they don't swallow reaction/reply taps;
  screen presented as fullScreenModal.

