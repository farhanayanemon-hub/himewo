---
name: HiMewo mobile (Expo) theming & redesign approach
description: How the mobile app is themed and the safe way to redesign it without a build/test env.
---

# HiMewo mobile lives in the same external repo

`artifacts/mobile` is an Expo / expo-router app inside the SAME external repo (`farhanayanemon-hub/himewo`) as web/api-server/mockup-sandbox. Edit it via the GitHub Git Data API like everything else (see `himewo-github-push.md`). There is no working local build for it here (pnpm install deadlocks; /tmp wipes), and Expo can't be exercised from this env — so "source pushed to GitHub" is the deliverable.

# Theming is 100% token-driven — one file re-themes the whole app

Every screen/component pulls colors from `useColors()` (`hooks/useColors.ts`) which returns the active palette from `constants/colors.ts` (light/dark by device scheme). **Changing `constants/colors.ts` re-themes the entire app at once.** No screen hardcodes the brand palette; the only intentional hardcoded hex are reaction emoji colors (`constants/reactions.ts`), the FB green `#31a24c`, and colorful menu category icons.

**Why it mattered:** the web was ported to Facebook blue (`#1877F2`, gray `#f0f2f5` bg, white cards) but mobile `colors.ts` was still the old warm-orange theme. Porting the FB blue/gray palette into that one file delivered the bulk of the "match the web" redesign.

# Redesign decision: port tokens + polish shared components, do NOT rewrite screens blind

The mobile app was already FUNCTIONALLY COMPLETE and structurally Facebook-like (edge-to-edge white post cards on gray bg, story bar, composer, long-press reaction picker, bottom tabs). With no test env, rewriting working screens risks breaking the functionality the task requires to keep working.

**How to apply:** for FB-style mobile redesign iterations, change `constants/colors.ts` (palette), then polish the shared pieces — `components/PostCard.tsx`, `StoryBar.tsx`, `ReactionBar.tsx` (RN `Animated` spring pop-in picker), `Avatar.tsx`, `app/(tabs)/_layout.tsx` (tab bar), `app/(tabs)/index.tsx` (top app bar + composer quick-actions). FB mobile cards are flat/edge-to-edge with thin gray gaps + tiny elevation — do NOT add big radius/floating shadows to post cards.
