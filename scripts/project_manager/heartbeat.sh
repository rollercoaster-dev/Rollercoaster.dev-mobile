#!/usr/bin/env bash
# Scheduled (non-interactive) manager wakeup. Run by the systemd timer on Linux.
set -euo pipefail

runtime="$HOME/.local/share/rollercoaster-pm/current"
state="$HOME/.local/state/rollercoaster-pm"
repo_root="${ROLLERCOASTER_REPO:-$HOME/Code/Rollercoaster.dev/Rollercoaster.dev-mobile}"
if ! git -C "$repo_root" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Set ROLLERCOASTER_REPO to the Rollercoaster.dev-mobile checkout" >&2
  exit 1
fi

cd "$repo_root"
exec claude -p --permission-mode auto \
  --add-dir "$runtime" --add-dir "$state" \
  "Scheduled project-manager wakeup. Read $runtime/.agents/skills/project-manager/SKILL.md and run one 'Each wakeup' cycle with the installed pm.py and telegram_bridge.py (state dir $state). Never merge. Never switch the checkout at $repo_root; use worktrees. Report via Telegram only when something actionable changed."
