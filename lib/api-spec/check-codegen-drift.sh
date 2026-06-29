#!/usr/bin/env bash
# Fails loudly when the committed generated API contract is out of sync with
# the OpenAPI spec. Regenerates the contract from openapi.yaml and reports drift
# if the regeneration produces any change to the tracked generated output.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Paths that orval generates from lib/api-spec/openapi.yaml. Any diff here after
# regeneration means the committed contract drifted from the spec.
GENERATED_PATHS=(
  "lib/api-zod/src/generated"
  "lib/api-client-react/src/generated"
)

echo "Regenerating API contract from openapi.yaml..."
pnpm --filter @workspace/api-spec exec orval --config ./orval.config.ts

echo "Checking for drift in generated output..."
if ! git --no-optional-locks diff --quiet -- "${GENERATED_PATHS[@]}" \
  || [ -n "$(git --no-optional-locks ls-files --others --exclude-standard -- "${GENERATED_PATHS[@]}")" ]; then
  echo ""
  echo "ERROR: Generated API contract is out of sync with lib/api-spec/openapi.yaml."
  echo "The committed generated output differs from a fresh codegen run."
  echo ""
  echo "Drift detected in:"
  git --no-optional-locks status --short -- "${GENERATED_PATHS[@]}"
  echo ""
  echo "Fix: run 'pnpm --filter @workspace/api-spec run codegen' and commit the result."
  exit 1
fi

echo "OK: generated API contract is in sync with the spec."
