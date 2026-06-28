---
name: HiMewo @types/react version skew
description: Why vendored shadcn UI files (calendar/button-group/spinner) fail typecheck, and the install-free fix.
---

# Two @types/react versions coexist

The monorepo resolves **two** `@types/react`: web/admin get `19.2.x` (catalog `^19.2.0`),
while the Expo apps drag in `19.1.17` (react-native 0.81.x peer). pnpm keeps both.

This makes a handful of **vendored shadcn** files fail `tsc` with either
"Index signature for type `--radix-${string}` is missing" or
"Two different types with this name exist, but they are unrelated":
`calendar.tsx`, `button-group.tsx`, `spinner.tsx` (in both `artifacts/web` and
`artifacts/mockup-sandbox`). These files are **unused** (not imported anywhere) and the
errors are typecheck-only — the running apps are unaffected (Vite doesn't typecheck).

## Fix used (install-free)
Cast the offending spreads/refs to the file's **local** React types so the skew can't
leak: `{...(props as React.HTMLAttributes<...>)}`, `ref as React.Ref<...>`,
`Comp as React.ElementType`, `{...(props as React.ComponentProps<typeof Button>)}`.

**Why not dedupe via a pnpm `overrides` pin?** The proper fix is one `@types/react`
version, but that needs `pnpm install` to take effect — install **deadlocks / is
unreliable in this environment** — and forcing the Expo apps off `19.1.17` risks
breaking their (currently passing) typecheck. Casting is the low-risk path.

**How to apply:** if these same files reappear after a shadcn re-add, re-apply the casts;
don't chase it with dependency changes unless you can run a real install.
