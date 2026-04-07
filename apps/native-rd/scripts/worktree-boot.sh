#!/usr/bin/env bash
# Usage: ./scripts/worktree-boot.sh [--port PORT]
# Starts Metro bundler on the worktree-specific port.
#
# The native binary must already be installed on the simulator.
# To connect deterministically, use: ./scripts/worktree-launch-ios.sh
#
# For native module changes, rebuild with: npx expo run:ios
#
# Exit codes: 0=success (Metro exited), 1=bad args

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="$("${SCRIPT_DIR}/worktree-port.sh" "$@")"
WORKTREE_PATH="$(git rev-parse --show-toplevel)"
WORKTREE_NAME="$(basename "$WORKTREE_PATH")"

"${SCRIPT_DIR}/worktree-port.sh" --port "$PORT" --json
echo "Starting Metro on port $PORT for worktree: $WORKTREE_NAME"
echo "Launch the simulator app on this bundle with: ./scripts/worktree-launch-ios.sh --port $PORT"
echo

EXPO_PORT="$PORT" npx expo start --port "$PORT" --no-dev-tools
