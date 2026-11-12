#!/usr/bin/env bash
# Moves the patch to a new upstream ONLYOFFICE version.
#
#   ./update.sh <new-upstream-tag> <new-base-image>
#   ./update.sh v10.0.1.20 onlyoffice/documentserver:10.0.1.1
#
# What it does: fetches the tag from the `upstream` remote, creates the branch
# mobile-edit-<tag> from it, cherry-picks every commit of the current branch on top of the
# current upstream tag, rewrites ./VERSION and runs check-hooks.sh. It stops on conflicts so
# you can resolve them (typically only when upstream changed src/lib/patch.jsx).
# Afterwards: ./build.sh, ./test-container.sh, test in a browser, ./image.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

NEW_TAG="${1:?usage: update.sh <new-upstream-tag> <new-base-image>}"
NEW_BASE="${2:?usage: update.sh <new-upstream-tag> <new-base-image>}"
# shellcheck source=VERSION
. "$HERE/VERSION"
OLD_TAG="$UPSTREAM_TAG"
OLD_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NEW_BRANCH="mobile-edit-$NEW_TAG"

[[ "$NEW_TAG" =~ ^v([0-9]+\.[0-9]+\.[0-9]+)\.([0-9]+)$ ]] || { echo "tag must look like v10.0.1.20" >&2; exit 1; }
NEW_PRODUCT="${BASH_REMATCH[1]}"
NEW_BUILD="${BASH_REMATCH[2]}"

[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "working tree has uncommitted changes" >&2; exit 1; }
git remote get-url upstream >/dev/null 2>&1 || { echo "no 'upstream' remote (https://github.com/ONLYOFFICE/web-apps.git)" >&2; exit 1; }
git rev-parse -q --verify "refs/tags/$OLD_TAG" >/dev/null || { echo "old tag $OLD_TAG is not available locally" >&2; exit 1; }
git rev-parse -q --verify "refs/heads/$NEW_BRANCH" >/dev/null && { echo "branch $NEW_BRANCH already exists" >&2; exit 1; }

echo "== fetching $NEW_TAG"
git fetch --depth 1 upstream "refs/tags/$NEW_TAG:refs/tags/$NEW_TAG"

echo "== $NEW_BRANCH from $NEW_TAG"
git checkout -b "$NEW_BRANCH" "$NEW_TAG"

COMMITS="$(git rev-list --reverse "$OLD_TAG..$OLD_BRANCH")"
echo "== applying $(wc -l <<<"$COMMITS") commit(s) from $OLD_BRANCH"
if ! git cherry-pick $COMMITS; then
  cat >&2 <<MSG

Cherry-pick stopped on a conflict. Resolve it (git status), then:
  git cherry-pick --continue
and re-run the remaining steps by hand:
  edit mobile-edit/VERSION (UPSTREAM_TAG=$NEW_TAG PRODUCT_VERSION=$NEW_PRODUCT BUILD_NUMBER=$NEW_BUILD BASE_IMAGE=$NEW_BASE REVISION=r1)
  mobile-edit/check-hooks.sh
Go back with: git cherry-pick --abort && git checkout $OLD_BRANCH && git branch -D $NEW_BRANCH
MSG
  exit 2
fi

cat > "$HERE/VERSION" <<EOF2
# Single source of truth for the version this branch is built against.
# Read by the scripts in this folder (shell syntax) and rewritten by update.sh.
UPSTREAM_TAG=$NEW_TAG
PRODUCT_VERSION=$NEW_PRODUCT
BUILD_NUMBER=$NEW_BUILD
# Official image the patched image is based on. Its package build must equal
# PRODUCT_VERSION-BUILD_NUMBER (the Dockerfile refuses to build otherwise).
BASE_IMAGE=$NEW_BASE
# Bump when the patch changes without a new upstream version.
REVISION=r1
EOF2
git add "$HERE/VERSION"
git commit -q -m "mobile-edit: build against $NEW_TAG ($NEW_BASE)"

echo "== checking hooks"
"$HERE/check-hooks.sh" || echo "!! upstream calls hooks the patch does not implement - see above"

cat <<MSG

Done: branch $NEW_BRANCH. Next:
  mobile-edit/build.sh
  mobile-edit/test-container.sh      # then test word, cell, slide in a phone-sized window
  mobile-edit/image.sh
  git push origin $NEW_BRANCH
MSG
