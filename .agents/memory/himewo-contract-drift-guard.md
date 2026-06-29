---
name: Contract drift guard (consumer typechecks)
description: Why consumer artifacts must typecheck with `tsc -b` (not `tsc -p`) to catch generated-API-client drift.
---

# Catching contract drift in client-consuming artifacts

The generated API client (`@workspace/api-client-react`) is a **composite** project
(`composite: true`, `emitDeclarationOnly`, `outDir: dist`). `dist/` is **gitignored**.
Consumers (`artifacts/web`, `artifacts/mobile`) reference it via `references` in their
tsconfig, so TypeScript redirects imports to the client's `dist/*.d.ts`, NOT `src`.

**Consequence:** a plain `tsc -p ... --noEmit` on a consumer typechecks against
whatever stale `dist` already exists. If the client `src/generated` changes (renamed/
removed member) but `dist` wasn't rebuilt, the consumer check passes anyway — drift goes
undetected.

**Rule:** consumer `typecheck` scripts must use `tsc -b` (build mode), which rebuilds
the composite reference's declarations from current source first, then typechecks the
consumer. Do NOT use `tsc -b --noEmit` — the composite reference must emit its `.d.ts`,
so `--noEmit` errors with TS6310 "Referenced project may not disable emit". Plain
`tsc -b` is correct: the client emits, the leaf keeps its own `noEmit`.

**Why:** the API codegen-drift guard only proves spec↔contract sync and typechecks the
API server; consumers can still break on a renamed/removed generated member. The
`web-typecheck` / `admin-typecheck` / `mobile-typecheck` validation steps close that gap.

**How to apply:** all build outputs (`.tsbuildinfo`, `lib/api-client-react/dist`) are
gitignored, so `tsc -b` does not dirty tracked files. `artifacts/admin` has NO project
reference and does not import the generated client, so it never catches client drift —
it's included for completeness only; web and mobile are the real consumers.
