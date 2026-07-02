---
name: Reaction picker hover/click reliability
description: Why the FB-style hover reaction picker missed desktop clicks and the pattern that fixes it.
---

# Hover reaction picker: click reliability

The web reaction picker (Like button → hover shows 7-emoji pill) had a bug: hovering
showed the pill but clicking an emoji did not apply the reaction on desktop.

**Root cause:** the floating pill was positioned with a fixed offset (`-top-14`),
leaving an empty vertical gap between the button and the pill. Moving the pointer
across that gap fired `mouseleave` → a close timer hid/unmounted the pill before the
`onClick` landed. So the click was lost.

**Fix pattern (durable):**
- Position the pill wrapper with `bottom-full` + a padding **bridge** (`pb-3`) so the
  hover region is continuous from the button up to the pill — no empty gap.
- Fire the reaction on **`onPointerDown` with `e.preventDefault()`**, not `onClick`,
  so it registers instantly before any hover-close race can remove the pill.
- Put the open/close handlers on the pill wrapper too, and give `close()` a grace
  timer (~220ms) that `open()` clears.

**Why:** hover-triggered floating menus that miss clicks are almost always a
gap/close-race, not a mutation bug — the `setReaction`/`removeReaction` handlers in
`post-card.tsx` and comment reactions in `pages/post.tsx` were already correct.

**How to apply:** any hover-to-open floating menu (reaction bars, hover cards) must
have a no-gap bridge and should commit its action on pointerdown, not click.

FB-style animation lives in `index.css` (`reaction-pop-in`, `reaction-bar-in`,
`reaction-wobble` on hover, `reaction-burst` + `reaction-float` on select).

## Mobile: long-press opens the picker (no hover on touch)
Touch devices have no hover, so the same pill is opened by a **press-and-hold**
gesture on the Like button (`ReactionControl`, shared by feed + single post page).
- `onPointerDown` starts a 450ms timer → `open()`; a `pointermove` >10px (scroll)
  aborts it; `pointerup`/`pointerleave`/`pointercancel` clear it.
- A `longPressFired` ref swallows the trailing synthetic **click** so a long-press
  doesn't also toggle Like; a quick tap still toggles Like normally.
- On touch there is no `mouseleave`, so a document `pointerdown` listener closes the
  picker when tapping outside; `onContextMenu` is suppressed during long-press.
- CSS `.reaction-like-btn { touch-action: manipulation; user-select/callout: none }`
  stops the OS text-selection/callout from hijacking the hold.

**Why:** desktop hover and mobile long-press must coexist on ONE component — don't
fork per-page; both `post-card.tsx` and `pages/post.tsx` just render `ReactionControl`.

## Native app long-press is a SEPARATE impl (not the web pointer-event one)
The section above (pointer events / CSS / document listeners) is the WEB app's touch
support. The native Expo app (`artifacts/mobile`) has its OWN long-press reaction picker
(`components/ReactionBar`, RN `Pressable` `onLongPress` + a `Modal` pill) and reached full
reaction parity BEFORE the web did. Every post surface renders it via `PostCard` (feed,
single post, profile, saved, groups), so quick-tap toggles Like and press-hold applies any
of the 7 reactions everywhere. Don't re-implement native reactions as "missing" — they exist.

## Mobile long-press: verified via touch emulation (not real hardware)
The mobile long-press flow was confirmed on himewo.com with Playwright mobile-touch
emulation (WebKit≈iOS Safari, Chromium+touch≈Android Chrome), viewport ~400x800:
long-press opens the picker and the chosen emoji applies + persists after reload;
quick tap toggles Like with no double-fire; press-then-drag (scroll) does NOT open
the picker — all confirmed on BOTH the feed and the single-post page.
**Caveat:** emulation ≠ a real phone; the OS text-selection/callout during hold
could not be directly observed (none appeared in captures). The reaction-picker
source lives in the EXTERNAL repo `farhanayanemon-hub/himewo` (`artifacts/web/...`),
NOT in this workspace, so it can't be inspected/edited here — only tested live.
himewo.com is auth-gated; automated testing needs a real email+password test login.
