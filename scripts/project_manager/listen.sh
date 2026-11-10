#!/usr/bin/env bash
# Instant read-only reply to one Telegram message. Started by telegram_bridge.ts.
# The prompt goes on stdin: --add-dir/--disallowedTools are variadic and would swallow it.
set -euo pipefail

update_id="${1:?update id required}"
runtime="$(cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../.." && pwd)"
pm_dir="$runtime/scripts/project_manager"
state="$HOME/.local/state/rollercoaster-pm"
repo_root="${ROLLERCOASTER_REPO:-$HOME/Code/Rollercoaster.dev/Rollercoaster.dev-mobile}"

history="$(bun "$pm_dir/telegram_bridge.ts" --state-dir "$state" --repo-root "$runtime" history --limit 12 2>/dev/null || true)"
status="$(bun "$pm_dir/pm.ts" --state-dir "$state" status 2>/dev/null || echo 'unavailable: run pm.ts status yourself')"
cd "$repo_root"
exec timeout 300 claude -p --permission-mode auto --model sonnet \
  --disallowedTools "Edit,Write,NotebookEdit" \
  --add-dir "$runtime" --add-dir "$state" <<< "Recent Telegram chat, oldest first (this is the context; read it before anything else):
$history

Manager state right now (pm.ts status; \`plan\` is today's plan or null, \`last_plan\` is an older one):
$status

Reply to Joe's newest message, update $update_id. Short replies like fixed / ok / yes answer the bot's last message above. Follow $pm_dir/LISTEN.md exactly. Tools: bun $pm_dir/pm.ts --state-dir $state ...; bun $pm_dir/telegram_bridge.ts --state-dir $state --repo-root $runtime ... ; gh for GitHub reads. Send exactly one reply, then stop."
