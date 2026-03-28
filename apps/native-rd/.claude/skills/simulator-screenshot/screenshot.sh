#!/usr/bin/env bash
# Usage: ./screenshot.sh [output_path]
# Captures a screenshot from the booted iOS simulator.
# Output: JSON to stdout with the file path.
# Exit codes: 0=success, 1=no booted simulator, 2=capture failed

set -euo pipefail

if ! command -v python3 &>/dev/null; then
  echo '{"error": "missing_dependency", "message": "python3 is required but not found"}' >&2
  exit 1
fi

OUTPUT="${1:-/tmp/simulator-screenshot-$(date +%s).png}"

# Validate output directory exists
OUTPUT_DIR="$(dirname "$OUTPUT")"
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "{\"error\": \"invalid_path\", \"message\": \"Output directory does not exist: $OUTPUT_DIR\"}" >&2
  exit 1
fi

# Find booted simulator UDID
DEVICE_JSON=$(xcrun simctl list devices --json 2>&1) || {
  echo '{"error": "simctl_failed", "message": "Failed to list simulators. Is Xcode installed?"}' >&2
  exit 1
}

UDID=$(echo "$DEVICE_JSON" | python3 -c "
import json, sys
d = json.load(sys.stdin)
booted = [dev['udid'] for devs in d['devices'].values() for dev in devs if dev.get('state') == 'Booted']
print(booted[0] if booted else '')
")

if [ -z "$UDID" ]; then
  echo '{"error": "no_booted_simulator", "message": "No booted iOS simulator found. Boot one with: xcrun simctl boot <UDID>"}' >&2
  exit 1
fi

CAPTURE_ERR=$(xcrun simctl io "$UDID" screenshot "$OUTPUT" 2>&1) || {
  echo "{\"error\": \"capture_failed\", \"message\": \"xcrun simctl screenshot failed: $CAPTURE_ERR\"}" >&2
  exit 2
}

python3 -c "import json, sys; print(json.dumps({'success': True, 'path': sys.argv[1], 'udid': sys.argv[2]}))" "$OUTPUT" "$UDID"
