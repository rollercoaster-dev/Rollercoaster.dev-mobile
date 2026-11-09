#!/usr/bin/env bash
# Instant read-only reply to one Telegram message. Started by telegram_bridge.py.
set -euo pipefail

update_id="${1:?update id required}"
runtime="$(cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../.." && pwd)"
pm_dir="$runtime/scripts/project_manager"
state="$HOME/.local/state/rollercoaster-pm"
repo_root="${ROLLERCOASTER_REPO:-$HOME/Code/Rollercoaster.dev/Rollercoaster.dev-mobile}"

cd "$repo_root"
exec timeout 300 claude -p --permission-mode auto --model sonnet \
  --disallowedTools Edit Write NotebookEdit \
  --add-dir "$runtime" --add-dir "$state" \
  "Telegram update $update_id from Joe. Follow $pm_dir/LISTEN.md exactly. Tools: python3 $pm_dir/pm.py --state-dir $state ...; python3 $pm_dir/telegram_bridge.py --state-dir $state --repo-root $runtime ... ; gh for GitHub reads. Send exactly one reply, then stop."
