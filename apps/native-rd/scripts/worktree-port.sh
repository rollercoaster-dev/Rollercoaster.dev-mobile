#!/usr/bin/env bash
# Usage: ./scripts/worktree-port.sh [--port PORT] [--json]
# Prints the worktree-specific Metro port. Defaults to a stable hash-derived
# port in the 8080-8179 range.

set -euo pipefail

WORKTREE_PATH="$(git rev-parse --show-toplevel 2>&1)" || {
  echo "Error: Not in a git repository. worktree-port.sh must be run inside a git worktree." >&2
  exit 1
}
WORKTREE_NAME="$(basename "$WORKTREE_PATH")"

PORT="${WORKTREE_PORT:-}"
OUTPUT_JSON=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      if [[ $# -lt 2 ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "Error: --port requires a numeric value" >&2
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    --json)
      OUTPUT_JSON=1
      shift
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PORT" ]; then
  if ! command -v python3 &>/dev/null; then
    echo "Error: python3 is required to auto-derive port. Use --port <PORT> instead." >&2
    exit 1
  fi

  PORT=$(python3 -c '
import hashlib, sys
worktree_path = sys.argv[1]
value = int(hashlib.md5(worktree_path.encode()).hexdigest(), 16)
print(8080 + (value % 100))
' "$WORKTREE_PATH") || {
    echo "Error: Failed to derive port from worktree path. Use --port <PORT> instead." >&2
    exit 1
  }
fi

if [ "$OUTPUT_JSON" -eq 1 ]; then
  python3 -c 'import json, sys; print(json.dumps({"worktree": sys.argv[1], "port": int(sys.argv[2]), "path": sys.argv[3]}))' \
    "$WORKTREE_NAME" "$PORT" "$WORKTREE_PATH"
else
  printf '%s\n' "$PORT"
fi
