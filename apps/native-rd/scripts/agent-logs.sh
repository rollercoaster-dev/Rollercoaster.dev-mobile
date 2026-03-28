#!/usr/bin/env bash
# Usage: ./scripts/agent-logs.sh [--lines N] [--since N]
# Captures Metro bundler output and RN crash logs as JSON lines.
# Output: One JSON object per log entry to stdout.
#
# --lines N  Number of minutes of logs to retrieve (default: 5)
# --since N  Alias for --lines
#
# Exit codes: 0=success, 1=bad args

set -euo pipefail

if ! command -v python3 &>/dev/null; then
  echo '{"error": "missing_dependency", "message": "python3 is required but not found"}' >&2
  exit 1
fi

MINUTES=5
CRASH_LOG_DIR="$HOME/Library/Logs/DiagnosticReports"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lines|--since)
      if [[ $# -lt 2 ]] || ! [[ "$2" =~ ^[1-9][0-9]*$ ]]; then
        echo "Error: --lines requires a positive integer" >&2; exit 1
      fi
      MINUTES="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# Emit a single JSON line
emit() {
  local level="$1" source="$2" message="$3"
  printf '{"level":"%s","source":"%s","message":%s,"ts":"%s"}\n' \
    "$level" "$source" \
    "$(printf '%s' "$message" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

# System log for the app process (RN logs via os_log)
# Capture output first to detect failures, then process
LOG_OUTPUT=$(log show --predicate 'process == "nativerd"' --last "${MINUTES}m" --style syslog 2>&1) || {
  emit "warn" "agent-logs" "log show failed or returned no results: ${LOG_OUTPUT:0:200}"
  LOG_OUTPUT=""
}

if [ -n "$LOG_OUTPUT" ]; then
  echo "$LOG_OUTPUT" | while IFS= read -r line; do
    # Skip empty lines and header
    [[ -z "$line" || "$line" == Filtering* || "$line" == Timestamp* ]] && continue

    if [[ "$line" =~ ERROR|error|Error ]]; then
      emit "error" "rn" "$line"
    elif [[ "$line" =~ WARN|warn|Warning ]]; then
      emit "warn" "rn" "$line"
    else
      emit "info" "rn" "$line"
    fi
  done
fi

# Check for recent crash reports
if [ ! -d "$CRASH_LOG_DIR" ]; then
  emit "info" "agent-logs" "Crash log directory not found: $CRASH_LOG_DIR"
elif ls "$CRASH_LOG_DIR"/nativerd*.ips 1>/dev/null 2>&1; then
  CRASH=$(ls -t "$CRASH_LOG_DIR"/nativerd*.ips 2>/dev/null | head -1)
  CRASH_MSG=$(head -20 "$CRASH" 2>/dev/null | tr '\n' ' ')
  emit "error" "crash" "Crash report found: $CRASH_MSG"
fi
