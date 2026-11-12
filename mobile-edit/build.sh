#!/usr/bin/env bash
# Builds the three mobile editors (word, cell, slide) with the version from ./VERSION.
#
# The version matters: without PRODUCT_VERSION the build defaults to "6.2.0.123d", and the
# trailing "d" switches the app into develop mode, where it tries to load sdkjs/develop/...
# and never opens the document.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# shellcheck source=VERSION
. "$HERE/VERSION"
export PRODUCT_VERSION BUILD_NUMBER

cd "$ROOT/vendor/framework7-react"
[ -d node_modules ] || npm install --no-audit --no-fund

for t in word cell slide; do
  echo "== deploy-$t (version $PRODUCT_VERSION.$BUILD_NUMBER)"
  out="$(npm run "deploy-$t" 2>&1)" || { echo "$out" | tail -40; exit 1; }
  if ! grep -q "Build complete" <<<"$out" || grep -q "ERROR in" <<<"$out"; then
    echo "$out" | tail -60
    echo "build of $t failed" >&2
    exit 1
  fi
  grep -E "compiled" <<<"$out" || true
done
