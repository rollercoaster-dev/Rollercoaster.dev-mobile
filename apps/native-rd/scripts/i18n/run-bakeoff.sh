#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

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

# --no-cache: each row runs fresh so stale judge verdicts don't leak across rubric edits.
exec ./node_modules/.bin/promptfoo eval \
  --config scripts/i18n/promptfoo/promptfooconfig.skip-ci.yaml \
  --output "$output" \
  --no-cache
