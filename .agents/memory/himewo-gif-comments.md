---
name: GIF comments
description: Comment GIF support — Tenor demo key, mediaUrl guards, GIF-only comment rules.
---

# GIF comments

- Comment reactions were ALREADY fully built (routes + `commentReactionsTable` + ReactionControl on post page) before the "comment reactions" task — always check for existing coverage before re-implementing.
- GIF search uses **Tenor v1 public demo key `LIVDSRZULELA`** client-side (GIPHY's old beta key is BANNED/403). Rate-limited but works anonymously; if usage grows, proxy server-side with a real key.
- `mediaUrl` on comments is user-supplied → createComment enforces the project-wide http(s)-prefix guard (stored-XSS). Also rejects comments with neither trimmed content nor mediaUrl (GIF-only comments ARE allowed).
- React 19 types: `useRef<T>()` with no argument fails typecheck — must pass explicit initial value (`useRef<T | undefined>(undefined)`).
