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

# Run promptfoo via its `#!/usr/bin/env node` shebang and let PATH resolve
# node. Under `bun run`, Bun's node shim is on PATH and its bundled node
# version satisfies promptfoo's engines requirement; `mise which node`
# can lag (v22.14 vs promptfoo's >=22.22), so don't override PATH here.
# (Copilot review on PR #172 flagged a theoretical better-sqlite3 risk —
# it doesn't fire in practice for promptfoo, and forcing real node broke
# the script. Revisit if a NAPI failure actually appears.)
#
# --no-cache: each row runs fresh so stale judge verdicts don't leak across rubric edits.
exec ./node_modules/.bin/promptfoo eval \
  --config scripts/i18n/promptfoo/promptfooconfig.skip-ci.yaml \
  --output "$output" \
  --no-cache
