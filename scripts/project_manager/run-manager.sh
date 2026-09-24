#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")" && pwd)"
repo_root="${ROLLERCOASTER_REPO:-$(cd "$script_dir/../.." && pwd)}"
if ! git -C "$repo_root" rev-parse --show-toplevel >/dev/null 2>&1; then
  repo_root="$HOME/Code/Rollercoaster.dev/Rollercoaster.dev-mobile"
fi
if ! git -C "$repo_root" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Set ROLLERCOASTER_REPO to the Rollercoaster.dev-mobile checkout" >&2
  exit 1
fi
exec codex -C "$repo_root" --sandbox workspace-write --ask-for-approval on-request \
  "Read $HOME/.local/share/rollercoaster-pm/current/.agents/skills/project-manager/SKILL.md and run one full on-demand cycle. Sync GitHub, maintain existing issue PRs, audit the next eligible Next issue against current main, claim it with the installed pm.py, and start an auto-issue coding agent immediately when capacity allows. Dispatch additional independent issues within the five-slot cap. Never merge. Report created PRs or exact blockers."
