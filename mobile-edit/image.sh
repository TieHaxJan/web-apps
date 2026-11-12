#!/usr/bin/env bash
# Builds the Document Server image with the patched mobile editors and, unless EXPORT=0,
# exports it as a tar.gz that can be copied to a server and loaded with `docker load`.
# Run ./build.sh first. Version, base image and revision come from ./VERSION.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# shellcheck source=VERSION
. "$HERE/VERSION"

TAG="${TAG:-onlyoffice-documentserver-mobile-edit:${PRODUCT_VERSION}.${BUILD_NUMBER}-${REVISION}}"
cd "$HERE/image"

rm -rf ctx && mkdir ctx
for e in documenteditor spreadsheeteditor presentationeditor; do
  src="$ROOT/apps/$e/mobile/dist/js/app.js"
  [ -f "$src" ] || { echo "missing $src - run ./build.sh first" >&2; exit 1; }
  cp "$src" "ctx/$e.js"
done

docker build \
  --build-arg "BASE=$BASE_IMAGE" \
  --build-arg "EXPECTED_VERSION=${PRODUCT_VERSION}-${BUILD_NUMBER}" \
  -t "$TAG" .
rm -rf ctx
echo "built $TAG"

if [ "${EXPORT:-1}" = 1 ]; then
  OUT="$HERE/image/$(echo "$TAG" | tr ':/' '--').tar.gz"
  docker save "$TAG" | gzip -6 > "$OUT"
  ls -lh "$OUT"
  sha256sum "$OUT"
fi
