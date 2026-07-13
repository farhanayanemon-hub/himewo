---
name: HiMewo input focus ring / black border
description: Why inputs showed a black border on focus, and the two-place fix; plus the chat-open composer jump fix.
---

# Input focus "black border" + premium input styling

## The black-border-on-click root cause
In `artifacts/web/src/index.css` the LIGHT-mode `--ring` AND `--primary` tokens are pure black (`0 0% 0%`). So any focus style using `ring-primary`/`border-primary` or the default `ring-ring` renders a **black** focus ring in light mode — this is the "kalo border ashe click korle" complaint.

**Fix once at the token:** set light-mode `--ring` to the brand purple (`270 95% 60%`; dark mode was already `270 95% 75%`). The shared `Input`/`Textarea` then use `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25` for a soft purple glow.

## Gotcha: auth + signup do NOT use the shared Input styles
`artifacts/web/src/pages/auth.tsx` and `artifacts/web/src/components/signup-wizard.tsx` each define their OWN hardcoded `inputClass` constant (FB-style white bg) that OVERRODE the shared focus with `focus-visible:ring-primary` (= black). twMerge lets the override win, so the token fix alone does NOT cover these — you MUST update each `inputClass` separately (use `focus-visible:border-ring focus-visible:ring-ring/25`).
**How to apply:** when told "fix inputs everywhere / remove black border", grep for `ring-primary` and hardcoded `inputClass`/raw `<input>` overrides, not just the shared component.

## Premium input contract (what was applied)
Shared web Input/Textarea: `h-14`, `rounded-2xl`, `bg-muted/40`, `px-5`, `text-[17px]`, soft purple focus glow. Mobile (both Expo apps): TextInput fontSize 16 (create-post/story composers left larger), `underlineColorAndroid="transparent"` on every TextInput (kills Android's default underline), and login/AccountRecovery `Field` gets an `isFocused` state toggling borderColor `c.border`↔`c.primary`.

## Web mirror "black border" is the browser focus OUTLINE (not a styled border)
The Expo apps are mirrored as web (himewo-mobile / himewo-chat .pages.dev). React Native Web renders every `<TextInput>` as a real `<input>`/`<textarea>`, so a focused field shows the **browser's default focus `outline`** — a black/dark rectangle around login/search/create-post/chat inputs. This is a CSS concept: `underlineColorAndroid`, `borderColor`, and RN focus state do NOT remove it. Theme `border` is light and `primary` is purple (`#c084fc`), so if you see a BLACK box on the web mirror, it's the outline.

**Fix:** strip the outline with global web CSS. Gotcha: these apps have NO `web.output` set in app.json → default is **`single` (SPA)**, and in SPA mode Expo Router **IGNORES `app/+html.tsx`** (only used for `output:"static"`). Verified: adding +html.tsx did NOT change the exported `index.html`. Instead inject the stylesheet at RUNTIME from `app/_layout.tsx` top-level, web-only, so it lands in the JS bundle:
```
if (Platform.OS === "web" && typeof document !== "undefined") { /* append <style> with input,textarea,...{outline:none!important} once by id */ }
```
Confirm by grepping the exported bundle for the style id (`himewo-web-focus-fix`) — if present, the fix shipped. Native ignores it.
**Why:** wasted a full mirror rebuild on +html.tsx before realizing SPA output ignores it.

## Chat-open composer jump (mobile-chat)
`artifacts/mobile-chat/app/messages/[id].tsx`: while `isLoading`, the branch must render the spinner inside a `{ flex: 1 }` centered View. Previously a bare `<ActivityIndicator marginTop:40>` collapsed the space between header and composer, so the composer floated to the TOP, then jumped to the bottom once the inverted FlatList (flex:1) rendered. The flex:1 filler keeps the composer pinned to the bottom during load = no layout jump.
