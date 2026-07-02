---
name: Dark mode + verified badge
description: How web dark mode works and where verified badges render.
---

# Dark mode + verified badge (web)

- Dark mode is pure client-side: `.dark` CSS vars already existed in `index.css` (`@custom-variant dark`); the feature only needed (1) pre-render init in web `main.tsx` reading localStorage key `himewo-theme` with `prefers-color-scheme` fallback (avoids light flash), and (2) a `ThemeToggle` (Moon/Sun) in the main-layout header action group — that group is visible on mobile too, so no separate mobile toggle needed.
- **Why** init lives in `main.tsx` before `createRoot`: applying the class after React mounts causes a visible light-mode flash.
- Verified badge: `isVerified` was ALREADY a required Profile field (backend serializes it; admin panel sets it) — only UI was missing. Shared `components/verified-badge.tsx` (BadgeCheck, text-primary); rendered in post-card author, profile-view header, post page comment authors. Post/comment `author` is the full `Profile` type, so no contract change needed.
- Follow buttons already existed on profile pages before this task — check profile.tsx headerActions before assuming follow UI is missing.
