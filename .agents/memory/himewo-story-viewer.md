---
name: Story viewer fixes
description: Mobile/web story viewer — fullscreen, cross-group nav, 7-reaction tray, self-reply block, delete-own-story endpoint.
---

# Story viewer

- **Delete story**: there was NO delete-story endpoint (only DELETE `/stories/:id/reaction` for reactions). Added DELETE `/stories/:id` (owner-only 403 guard). `messages.story_id` is a bare integer with NO FK, so deleting a story never orphan-blocks — but you MUST delete `story_reactions` + `story_views` first (those DO have FK to story). Route order: `/stories/:id/reaction` is registered before `/stories/:id`, so single-segment delete never shadows it.

- **"Could not send" on story reply** was NOT a backend bug: the reply route returns 400 for `story.authorId === req.userId` ("can't reply to your own story"). Users hit it constantly by testing on their own story. Fix = hide the reply/react UI on your own story (both clients) via `isOwn = story.author?.id === user.id`; show delete instead. Keep an `onError` note for genuine failures on others' stories.

- **Cross-group navigation**: viewer must advance person-to-person, not just within one author. Track `pos={g,s}` across all groups; goNext rolls into next group at end, goPrev rolls into previous group's last story.
  - **Position reset trap**: do NOT `setPos(initial)` on every `groups` change — background refetches snap the viewer back to the opening story. Position ONCE (lazy `useState` init from cache + a `positionedRef`-guarded effect for cold loads).

- **Auto-advance timer**: use a SINGLE `useEffect` keyed on `[pos.g, pos.s, current?.id, frozen]` that stops any prior anim then starts one. Two separate effects (one on story change, one on `frozen`) both fire with `frozen===false` on mount → double `goNext()` / skipped stories.

- **Tap-navigation zones swallow taps**: the left/right full-height `Pressable` overlays intercept reaction/reply presses. Give them `bottom: 190` so they stop above the bottom interaction bar.

- **Fullscreen**: register `story/[id]` in the root Stack as `presentation: "fullScreenModal"` so it covers the tab bar / create-story chrome. The file existed but was unregistered.

- **All 7 reactions**: `reactionOrder` (like/love/care/haha/wow/sad/angry) in `constants/reactions.ts`; mobile shows an expandable tray, web a 7-emoji row. Guard `Haptics.selectionAsync()` with `Platform.OS !== "web"` (rejects on web).
