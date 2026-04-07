#!/usr/bin/env bash
# Usage: ./scripts/worktree-launch-ios.sh [--port PORT] [--device-id UDID] [--app-id BUNDLE_ID]
# Launches the already-installed iOS app with a worktree-specific Metro port.
# This sets RCT_METRO_PORT for the launched process so the app binds to the
# correct Metro instance and persists that bundle location for later relaunches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=""
DEVICE_ID="${IOS_DEVICE_ID:-}"
APP_ID="com.joe.rd.native-rd"

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
    --device-id)
      if [[ $# -lt 2 ]]; then
        echo "Error: --device-id requires a simulator UDID" >&2
        exit 1
      fi
      DEVICE_ID="$2"
      shift 2
      ;;
    --app-id)
      if [[ $# -lt 2 ]]; then
        echo "Error: --app-id requires a bundle identifier" >&2
        exit 1
      fi
      APP_ID="$2"
      shift 2
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PORT" ]; then
  PORT="$("${SCRIPT_DIR}/worktree-port.sh")"
fi

if [ -z "$DEVICE_ID" ]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required to detect the booted simulator." >&2
    exit 1
  fi

  DEVICE_ID="$(xcrun simctl list devices booted -j | python3 -c '
import json, sys
data = json.load(sys.stdin)
for runtime_devices in data.get("devices", {}).values():
    for device in runtime_devices:
        if device.get("state") == "Booted" and device.get("isAvailable", True):
            print(device["udid"])
            raise SystemExit(0)
raise SystemExit(1)
')"
fi

if [ -z "$DEVICE_ID" ]; then
  echo "Error: No booted iOS simulator found. Boot a simulator first." >&2
  exit 1
fi

if ! curl --silent --fail "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "Error: Metro is not reachable on port ${PORT}." >&2
  echo "Start it first with: ./scripts/worktree-boot.sh --port ${PORT}" >&2
  exit 1
fi

if ! xcrun simctl get_app_container "$DEVICE_ID" "$APP_ID" app >/dev/null 2>&1; then
  echo "Error: ${APP_ID} is not installed on simulator ${DEVICE_ID}." >&2
  echo "Install it first with: bun run ios -- --port ${PORT}" >&2
  exit 1
fi

xcrun simctl terminate "$DEVICE_ID" "$APP_ID" >/dev/null 2>&1 || true
SIMCTL_CHILD_RCT_METRO_PORT="$PORT" xcrun simctl launch "$DEVICE_ID" "$APP_ID" >/dev/null

python3 -c 'import json, sys; print(json.dumps({"deviceId": sys.argv[1], "appId": sys.argv[2], "port": int(sys.argv[3])}))' \
  "$DEVICE_ID" "$APP_ID" "$PORT"
