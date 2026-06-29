#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Regenerate the OpenAPI client/types and rebuild the composite lib declarations
# (lib/*/dist is gitignored, so per-package `tsc -p` consumers need this first).
pnpm --filter @workspace/api-spec run codegen
# Apply the current Drizzle schema to the environment database. push-force is
# non-interactive (stdin is closed during post-merge) and safe for the dev DB.
pnpm --filter @workspace/db run push-force
