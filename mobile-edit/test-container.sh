#!/usr/bin/env bash
# Starts a throwaway Document Server on http://localhost (port 80) with the patched mobile
# editors, plus the bundled example app (JWT off), for testing in a browser.
#
#   ./test-container.sh               base image + patched bundles copied over it
#   STOCK=1 IMAGE=<tag> ./test-container.sh   use an image as it is (e.g. the built one)
#
# Open http://localhost/example/editor?fileExt=docx&user=uid-1&type=mobile&sample=true
# (also xlsx, pptx) in a phone-sized browser window. Keep the browser window visible: a hidden
# page does not render frames and the editor then looks stuck on "Loading".
#
# Recreating the container changes the versioned URL prefix, which busts the browser cache
# (the editor files are served with "immutable, max-age=1y").
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
# shellcheck source=VERSION
. "$HERE/VERSION"

IMAGE="${IMAGE:-$BASE_IMAGE}"
NAME="${NAME:-oo-test}"
APPS=/var/www/onlyoffice/documentserver/web-apps/apps

docker rm -f "$NAME" >/dev/null 2>&1 || true
# ALLOW_PRIVATE_IP_ADDRESS: the server refuses to download from localhost (SSRF protection)
# otherwise. Test container only - do not set this on a production server.
docker run -d --name "$NAME" -p 80:80 -e JWT_ENABLED=false \
  -e ALLOW_PRIVATE_IP_ADDRESS=true -e ALLOW_META_IP_ADDRESS=true "$IMAGE" >/dev/null
for _ in $(seq 1 40); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost/healthcheck)" = 200 ] && break
  sleep 5
done

if [ "${STOCK:-0}" != 1 ]; then
  for e in documenteditor spreadsheeteditor presentationeditor; do
    docker exec "$NAME" sh -c "cp $APPS/$e/mobile/dist/js/app.js $APPS/$e/mobile/dist/js/app.js.orig"
    docker cp "$ROOT/apps/$e/mobile/dist/js/app.js" "$NAME:$APPS/$e/mobile/dist/js/app.js"
  done
fi

# The example app must reach the server under the same address the browser uses.
docker exec "$NAME" sh -c "sed -i 's#\"siteUrl\": \"http://documentserver/\"#\"siteUrl\": \"http://localhost/\"#' /etc/onlyoffice/documentserver-example/default.json; supervisorctl start ds:example >/dev/null"
sleep 5
echo "ready: http://localhost/example/"
echo "remove with: docker rm -f $NAME"
