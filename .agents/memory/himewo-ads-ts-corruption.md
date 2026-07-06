---
name: ads.ts corruption landmine on GitHub main
description: A stray marker line at the top of api-server ads.ts breaks typecheck and any Railway build from GitHub main.
---

# ads.ts corruption on GitHub main

`artifacts/api-server/src/routes/ads.ts` on GitHub `farhanayanemon-hub/himewo`
`main` has a stray injected line 2: `===== artifacts/api-server/src/routes/ads.ts (200) =====`
(blank line 1, marker line 2, real `import` starts line 3). This is a hard TS
syntax error (`TS1109 Expression expected`) and fails `pnpm run typecheck` for
`@workspace/api-server`.

**Why it matters:** Railway auto-builds api-server from GitHub `main`. The live API
(api.himewo.com) is currently 200 only because it runs an OLDER successful deploy —
the next push that triggers a Railway build would fail on this syntax error. It is a
latent landmine.

**How to apply:** the fix is trivial — delete the blank line 1 + marker line 2 so
the file starts with the `import { Router ... }` line. Was fixed locally in the
workspace (typecheck goes green). To repair the live source, push the corrected
`ads.ts` to GitHub `main` via the REST Git-Data API (git CLI blocked) — this also
unblocks future Railway deploys. Pushing api-server is otherwise sensitive; see the
divergence memo, but on a full-repo import that concern is gone.
