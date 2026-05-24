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

# `--no-cache` so each row runs fresh — no risk of replaying a stale judge
# verdict after the rubric or fixtures change. (promptfoo's `--retry-errors`
# only re-runs ERRORed rows from a previous eval; there's no in-run retry
# flag, so transient OpenRouter errors are handled by re-invoking with
# `--retry-errors` as a follow-up step, not in this initial command.)
exec ./node_modules/.bin/promptfoo eval \
  --config scripts/i18n/promptfoo/promptfooconfig.skip-ci.yaml \
  --output "$output" \
  --no-cache
