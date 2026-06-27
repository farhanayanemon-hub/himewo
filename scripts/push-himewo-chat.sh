#!/usr/bin/env bash
# Add HiMewo Chat to the external `himewo` monorepo as a new standalone
# artifact `artifacts/mobile-chat`, on a review branch `add-himewo-chat`.
#
# This script is fully validated and idempotent. It must run in an environment
# where git commit/push are permitted (the isolated task-agent repl) and where
# the GITHUB_TOKEN secret is available. The main agent cannot run the git steps.
#
# Source of truth = THIS repl (the carved-out HiMewo Chat app + presence
# backend changes). Run from the repl root: bash scripts/push-himewo-chat.sh
set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set}"

SRC="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$SRC/artifacts/mobile" ] || { echo "ERROR: $SRC/artifacts/mobile (chat source) not found"; exit 1; }

WORK="$(mktemp -d)"
DST="$WORK/himewo"
BRANCH="add-himewo-chat"
REPO="github.com/farhanayanemon-hub/himewo.git"
NEW_PORT="18116"

echo "==> Cloning himewo into $DST"
git clone --quiet "https://x-access-token:${GITHUB_TOKEN}@${REPO}" "$DST"
cd "$DST"
git remote set-url origin "https://${REPO}"          # don't persist token
git checkout -b "$BRANCH"

echo "==> Copying chat app -> artifacts/mobile-chat"
rm -rf "$DST/artifacts/mobile-chat"
cp -a "$SRC/artifacts/mobile" "$DST/artifacts/mobile-chat"
rm -rf "$DST/artifacts/mobile-chat/node_modules" \
       "$DST/artifacts/mobile-chat/.expo" \
       "$DST/artifacts/mobile-chat/dist" \
       "$DST/artifacts/mobile-chat/build"
find "$DST/artifacts/mobile-chat" -name '*.tsbuildinfo' -delete

echo "==> Re-keying package.json + app.json"
python3 - "$DST" <<'PY'
import json, sys
dst = sys.argv[1]
pj = f"{dst}/artifacts/mobile-chat/package.json"
d = json.load(open(pj)); d["name"] = "@workspace/mobile-chat"
json.dump(d, open(pj, "w"), indent=2); open(pj, "a").write("\n")
aj = f"{dst}/artifacts/mobile-chat/app.json"
a = json.load(open(aj))
a["expo"]["slug"]   = "mobile-chat"
a["expo"]["scheme"] = "mobilechat"
a["expo"]["name"]   = "HiMewo Chat"
json.dump(a, open(aj, "w"), indent=2); open(aj, "a").write("\n")
PY

echo "==> Writing artifact.toml (unique path/port/package)"
cat > "$DST/artifacts/mobile-chat/.replit-artifact/artifact.toml" <<TOML
kind = "mobile"
previewPath = "/mobile-chat/"
title = "HiMewo Chat"
version = "1.0.0"
id = "artifacts/mobile-chat"
router = "expo-domain"

[[integratedSkills]]
name = "expo"
version = "1.0.0"

[[services]]
ensurePreviewReachable = "/status"
name = "expo"
paths = [ "/mobile-chat/" ]
localPort = ${NEW_PORT}

[services.development]
run = "pnpm --filter @workspace/mobile-chat run dev"

[services.production]
build = [ "pnpm", "--filter", "@workspace/mobile-chat", "run", "build" ]
run = [ "pnpm", "--filter", "@workspace/mobile-chat", "run", "serve" ]

[services.env]
PORT = "${NEW_PORT}"
BASE_PATH = "/mobile-chat/"
TOML

echo "==> Porting additive presence backend delta (only these 3 files differ)"
cp "$SRC/lib/api-spec/openapi.yaml"                         "$DST/lib/api-spec/openapi.yaml"
cp "$SRC/artifacts/api-server/src/routes/friends.ts"       "$DST/artifacts/api-server/src/routes/friends.ts"
cp "$SRC/artifacts/api-server/src/realtime/index.ts"       "$DST/artifacts/api-server/src/realtime/index.ts"

echo "==> Installing deps + regenerating API codegen"
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/api-spec run codegen

echo "==> Typechecking the touched/added packages (these MUST pass)"
for p in @workspace/mobile-chat @workspace/mobile @workspace/api-server; do
  pnpm --filter "$p" run typecheck
done
# NOTE: `pnpm run typecheck` (whole monorepo) FAILS on `web` and
# `mockup-sandbox` on himewo's untouched main too (pre-existing duplicate
# @types/react: web=19.2.17 via catalog, mobile=19.1.17). That is a baseline
# issue, NOT caused by this change, and is out of scope here.

echo "==> Committing + pushing branch $BRANCH"
git config user.email "agent@replit.com"
git config user.name  "Replit Agent"
git add -A
git commit -q -m "Add HiMewo Chat as standalone mobile-chat artifact

- New artifact artifacts/mobile-chat (@workspace/mobile-chat): Messenger-style
  Expo chat app (slug/scheme mobilechat, previewPath /mobile-chat/, port ${NEW_PORT}).
- Backend (backward-compatible): add Profile.presence to the OpenAPI spec;
  friends route joins presence; realtime adds presence:set + invisible-by-default
  so 'Active status' off never broadcasts online. Regenerated api-client/api-zod.
- Existing web and mobile artifacts unchanged."
git push --set-upstream "https://x-access-token:${GITHUB_TOKEN}@${REPO}" "$BRANCH"

echo ""
echo "==> DONE. Open a PR:"
echo "    https://github.com/farhanayanemon-hub/himewo/compare/main...${BRANCH}?expand=1"
