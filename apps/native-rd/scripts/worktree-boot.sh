#!/usr/bin/env bash
# Usage: ./scripts/worktree-boot.sh [--port PORT]
# Starts Metro bundler on a port unique to this worktree.
# The port is derived from a hash of the worktree path (range 8080-8179).
#
# The native binary must already be installed on the simulator.
# To connect: Dev Menu > Change bundler location > localhost:<port>
#
# For native module changes, rebuild with: npx expo run:ios
#
# Exit codes: 0=success (Metro exited), 1=bad args

set -euo pipefail

WORKTREE_PATH="$(git rev-parse --show-toplevel 2>&1)" || {
  echo "Error: Not in a git repository. worktree-boot.sh must be run inside a git worktree." >&2
  exit 1
}
WORKTREE_NAME="$(basename "$WORKTREE_PATH")"

PORT="${WORKTREE_PORT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      if [[ $# -lt 2 ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "Error: --port requires a numeric value" >&2; exit 1
      fi
      PORT="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# Derive a stable port in 8080-8179 range from worktree path hash
if [ -z "$PORT" ]; then
  if ! command -v python3 &>/dev/null; then
    echo "Error: python3 is required to auto-derive port. Use --port <PORT> instead." >&2
    exit 1
  fi
  PORT=$(python3 -c "
import hashlib, sys
h = int(hashlib.md5(sys.argv[1].encode()).hexdigest(), 16)
print(8080 + (h % 100))
" "$WORKTREE_PATH") || {
    echo "Error: Failed to derive port from worktree path. Use --port <PORT> instead." >&2
    exit 1
  }
fi

python3 -c "import json, sys; print(json.dumps({'worktree': sys.argv[1], 'port': int(sys.argv[2]), 'path': sys.argv[3]}))" "$WORKTREE_NAME" "$PORT" "$WORKTREE_PATH" 2>/dev/null || \
  echo "{\"worktree\": \"$WORKTREE_NAME\", \"port\": $PORT}"
echo "Starting Metro on port $PORT for worktree: $WORKTREE_NAME"
echo "Connect the simulator: Dev Menu > Change bundler location > localhost:$PORT"
echo ""

EXPO_PORT="$PORT" npx expo start --port "$PORT" --no-dev-tools
