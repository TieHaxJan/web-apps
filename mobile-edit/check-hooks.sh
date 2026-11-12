#!/usr/bin/env bash
# Compares what the mobile apps call with what each editor's src/lib/patch.jsx implements.
# Run it after moving the patch to a new upstream version: something upstream started calling
# that patch.jsx does not define means a feature is silently missing (the callers are guarded
# with `EditorUIController.x && ...`).
#
# Two interfaces are checked:
#   - EditorUIController.<hook>     called from controllers and views
#   - this.intf.<method>()          called from the stores (focus / selection state), installed
#                                   by the patch as an object literal
#
# Exit status 1 if anything called is not implemented.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
status=0

for e in documenteditor spreadsheeteditor presentationeditor; do
  src="$ROOT/apps/$e/mobile/src"
  patch="$src/lib/patch.jsx"

  used="$(grep -rhoE 'EditorUIController\.[A-Za-z]+' "$src" --include='*.js' --include='*.jsx' --exclude=patch.jsx \
          | sed 's/EditorUIController\.//' | sort -u)"
  defined="$(grep -hoE '^EditorUIController\.[A-Za-z]+ *=' "$patch" | sed -E 's/EditorUIController\.([A-Za-z]+) *=/\1/' | sort -u)"
  missing="$(comm -23 <(echo "$used") <(echo "$defined"))"
  unused="$(comm -13 <(echo "$used") <(echo "$defined"))"

  echo "== $e: ${used//$'\n'/ }"
  if [ -n "$missing" ]; then
    echo "   MISSING hooks in patch.jsx: ${missing//$'\n'/ }"
    status=1
  else
    echo "   all called hooks are implemented"
  fi
  if [ -n "$unused" ]; then echo "   defined but no longer called: ${unused//$'\n'/ }"; fi

  intf_used="$(grep -rhoE 'this\.intf\.[A-Za-z]+' "$src/store" | sed 's/this\.intf\.//' | sort -u)"
  intf_defined="$(grep -hoE '^[[:space:]]+(get[A-Za-z]+|filterFocusObjects)[[:space:]]*:' "$patch" \
                  | sed -E 's/^[[:space:]]+([A-Za-z]+)[[:space:]]*:/\1/' | sort -u)"
  intf_missing="$(comm -23 <(echo "$intf_used") <(echo "$intf_defined"))"
  if [ -n "$intf_missing" ]; then
    echo "   MISSING store methods (this.intf): ${intf_missing//$'\n'/ }"
    status=1
  else
    echo "   store interface complete: ${intf_used//$'\n'/ }"
  fi
done
exit $status
