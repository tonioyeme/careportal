#!/usr/bin/env bash
# Builds and runs both test suites. See scripts/verify.ts and scripts/render.tsx.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=.tmp
mkdir -p "$OUT"

ESBUILD="npx esbuild --bundle --platform=node --target=node20 --log-level=error"

echo "── wiring checks ─────────────────────────────────────────────"
# Catches the class of bug where a module exports something correct and
# nothing ever calls it. Unit tests miss these because they call directly.
wire() {  # wire <description> <pattern> <file>
  if grep -q "$2" "$3"; then echo "  ok   $1"; else echo "  FAIL $1 ($2 not in $3)"; fail=1; fi
}
fail=0
wire "App boots the WebMCP layer"            "bootstrapWebMCP()"   src/App.tsx
wire "App renders the confirmation card"     "<ConfirmCard"        src/App.tsx
wire "Appointment detail opens route scope"  "registerRouteScope"  src/pages/AppointmentDetail.tsx
wire "Appointment detail closes route scope" "closeRouteScope"     src/pages/AppointmentDetail.tsx
wire "To-do page renders the sign modal"     "<SignModal"          src/pages/Todo.tsx
wire "App routes to the insurance page"      "path=\"/insurance\""  src/App.tsx
wire "Insurance is in the side nav"          "Insurance"           src/components/SideNav.tsx
for k in appointment medication result thread document claim; do
  if grep -rq "kind=\"$k\"" src/pages src/components; then
    echo "  ok   $k rows are highlightable"
  else
    echo "  FAIL nothing is highlightable with kind=$k"; fail=1
  fi
done

echo
echo "── render smoke test ─────────────────────────────────────────"
$ESBUILD scripts/render.tsx --format=cjs --jsx=automatic \
  --alias:use-sync-external-store/shim/with-selector.js=./scripts/sse-shim.cjs \
  --outfile="$OUT/render.cjs"
for s in login chrome badge linda margaret sign confirm-idle confirm confirm-editable; do
  node "$OUT/render.cjs" "$s" 2>/dev/null || fail=1
done

echo
echo "── tool integration test ─────────────────────────────────────"
echo "   (includes a real 60s confirmation timeout — be patient)"
$ESBUILD scripts/verify.ts --format=esm --outfile="$OUT/verify.mjs"
node "$OUT/verify.mjs" || fail=1

exit $fail
