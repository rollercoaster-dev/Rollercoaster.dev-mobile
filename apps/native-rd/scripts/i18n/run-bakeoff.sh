#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${APP_DIR}"

# .env.local loader divergence with run-ios.sh/run-android.sh is tracked in
# issue #173 (sub-item 3) — that ticket covers both the exec-risk and the
# clobber-pre-exported-vars angles raised by review.
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "i18n:bakeoff requires OPENROUTER_API_KEY — set it in apps/native-rd/.env.local or export it in your shell" >&2
  exit 1
fi

reports_dir="scripts/i18n/promptfoo/reports"
mkdir -p "$reports_dir"
output="$reports_dir/$(date +%Y%m%d-%H%M%S).html"

# bunfig.toml routes `#!/usr/bin/env node` shebangs through Bun, which
# re-triggers the better-sqlite3 NAPI incompat that broke our first bake-off
# attempt (full story in scripts/jest-node.sh). Strip Bun's node shim from
# PATH and invoke real node directly.
clean_path=""
IFS=":"
for path_entry in ${PATH:-}; do
  case "$path_entry" in
    */bun-node-*) continue ;;
  esac

  if [ -z "$clean_path" ]; then
    clean_path="$path_entry"
  else
    clean_path="$clean_path:$path_entry"
  fi
done
unset IFS

export PATH="$clean_path"
unset NODE npm_node_execpath

node_bin="$(command -v node)"
if command -v mise >/dev/null 2>&1; then
  mise_node="$(mise which node 2>/dev/null || true)"
  if [ -n "$mise_node" ]; then
    node_bin="$mise_node"
  fi
fi

# --no-cache: each row runs fresh so stale judge verdicts don't leak across rubric edits.
exec "$node_bin" node_modules/.bin/promptfoo eval \
  --config scripts/i18n/promptfoo/promptfooconfig.skip-ci.yaml \
  --output "$output" \
  --no-cache
