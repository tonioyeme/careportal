#!/usr/bin/env bash
# Builds and runs both test suites. See scripts/verify.ts and scripts/render.tsx.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=.tmp
mkdir -p "$OUT"

ESBUILD="npx esbuild --bundle --platform=node --target=node20 --log-level=error"

echo "── render smoke test ─────────────────────────────────────────"
$ESBUILD scripts/render.tsx --format=cjs --jsx=automatic \
  --alias:use-sync-external-store/shim/with-selector.js=./scripts/sse-shim.cjs \
  --outfile="$OUT/render.cjs"
fail=0
for s in login chrome badge linda margaret sign confirm-idle confirm confirm-editable; do
  node "$OUT/render.cjs" "$s" 2>/dev/null || fail=1
done

echo
echo "── tool integration test ─────────────────────────────────────"
echo "   (includes a real 60s confirmation timeout — be patient)"
$ESBUILD scripts/verify.ts --format=esm --outfile="$OUT/verify.mjs"
node "$OUT/verify.mjs" || fail=1

exit $fail
