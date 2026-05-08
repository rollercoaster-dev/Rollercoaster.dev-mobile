#!/usr/bin/env bash
# Stable iOS launcher for native-rd.
# Expo's managed CocoaPods step has been flaky in this monorepo, so we do the
# native dependency install explicitly and then ask Expo to skip that phase.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
IOS_DIR="${APP_DIR}/ios"

cd "${APP_DIR}"

# Source .env.local if present — picks up IOS_DEVICE_ID and similar developer-local overrides.
# Existing shell exports take precedence (we don't clobber).
if [ -f "${APP_DIR}/.env.local" ]; then
  while IFS= read -r line || [ -n "${line}" ]; do
    case "${line}" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    if [ -z "${!key:-}" ]; then
      export "${key}=${value}"
    fi
  done < "${APP_DIR}/.env.local"
fi

resolve_node_bin() {
  if [ -n "${NODE:-}" ] && [ -x "${NODE}" ] && [[ "${NODE}" != /private/tmp/bun-node-* ]]; then
    printf '%s\n' "${NODE}"
    return 0
  fi

  while IFS= read -r candidate; do
    if [ -x "${candidate}" ] && [[ "${candidate}" != /private/tmp/bun-node-* ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done < <(which -a node | awk '!seen[$0]++')

  return 1
}

if ! NODE_BIN="$(resolve_node_bin)"; then
  echo "Error: Node.js is required to run native-rd on iOS." >&2
  exit 1
fi

# Bun script execution can resolve `node` differently from the app's expected
# runtime. Expo autolinking inside CocoaPods must use the same Node binary.
export NODE_BINARY="${NODE_BIN}"
export PATH="$(dirname "${NODE_BIN}"):${PATH}"

# Bun's npm-compat environment variables can confuse Expo autolinking when
# CocoaPods shells out through Ruby. Clear them before touching native tooling.
while IFS='=' read -r env_name _; do
  unset "${env_name}"
done < <(env | awk -F= '/^npm_/ { print $1 }')

if ! command -v pod >/dev/null 2>&1; then
  echo "Error: CocoaPods is required to run native-rd on iOS." >&2
  echo "Install CocoaPods, then retry." >&2
  exit 1
fi

if [ ! -d "${IOS_DIR}" ]; then
  echo "iOS project missing; generating native files with Expo prebuild..."
  npx expo prebuild --platform ios --no-install
fi

echo "Installing iOS pods directly before Expo launch..."
(
  cd "${IOS_DIR}"
  pod install --repo-update --ansi
)

echo "Launching iOS app with Expo (skipping Expo-managed install step)..."

if [ -n "${IOS_DEVICE_ID:-}" ]; then
  exec npx expo run:ios --no-install --device "${IOS_DEVICE_ID}" "$@"
fi

exec npx expo run:ios --no-install "$@"
