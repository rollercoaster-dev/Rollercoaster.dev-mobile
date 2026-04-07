#!/usr/bin/env bash

set -euo pipefail

if ! command -v maestro >/dev/null 2>&1; then
  echo "Skipping native-rd E2E: Maestro CLI is not installed in this environment."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if xcrun simctl list devices booted | grep -q "Booted"; then
  "${SCRIPT_DIR}/worktree-launch-ios.sh"
fi

maestro test e2e/flows/
