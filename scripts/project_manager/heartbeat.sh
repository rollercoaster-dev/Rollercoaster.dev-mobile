#!/usr/bin/env bash
# Scheduled manager wakeup: plan (09:00), tick (every 30 min), recap (18:00). Weekdays only.
set -euo pipefail

mode="${1:-tick}"
runtime="$HOME/.local/share/rollercoaster-pm/current"
pm_dir="$runtime/scripts/project_manager"
state="$HOME/.local/state/rollercoaster-pm"
repo_root="${ROLLERCOASTER_REPO:-$HOME/Code/Rollercoaster.dev/Rollercoaster.dev-mobile}"

if [ "$(TZ=Europe/Berlin date +%u)" -ge 6 ]; then
  exit 0 # Weekend: nothing runs.
fi
if ! git -C "$repo_root" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Set ROLLERCOASTER_REPO to the Rollercoaster.dev-mobile checkout" >&2
  exit 1
fi

# One wakeup at a time: a long tick makes the next ones no-ops, never a pile-up.
exec 9>"$state/heartbeat.lock"
if ! flock -n 9; then
  echo "$(date -Is) $mode skipped: previous wakeup still running"
  exit 0
fi

case "$mode" in
  plan) task="MORNING PLAN. Run the skill's 'Morning plan' section." ;;
  tick) task="WORK TICK. Run the skill's 'Work tick' section." ;;
  recap) task="EVENING RECAP. Run the skill's 'Evening recap' section." ;;
  *) echo "Unknown mode: $mode" >&2; exit 2 ;;
esac

cd "$repo_root"
echo "$(date -Is) $mode start"
claude -p --permission-mode auto \
  --add-dir "$runtime" --add-dir "$state" \
  "$task Read $runtime/.agents/skills/project-manager/SKILL.md first and follow it. Tools: python3 $pm_dir/pm.py --state-dir $state ...; python3 $pm_dir/telegram_bridge.py --state-dir $state --repo-root $runtime ... Never merge. Never switch the checkout at $repo_root; use worktrees."
echo "$(date -Is) $mode end"
