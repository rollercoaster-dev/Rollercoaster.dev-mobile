#!/usr/bin/env bash
# Stable Android launcher for native-rd. Mirrors run-ios.sh: sources
# .env.local, resolves a non-bun-temp `node`, then hands off to expo run:android.
# Adds Android-specific setup: SDK detection, local.properties bootstrap,
# adb reverse for Metro, and localhost packager pinning so the dev client
# inside an emulator/device reliably reaches the bundler.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANDROID_DIR="${APP_DIR}/android"

cd "${APP_DIR}"

# Source .env.local — picks up ANDROID_DEVICE_ID / IOS_DEVICE_ID / similar.
# Existing shell exports take precedence.
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
  echo "Error: Node.js is required to run native-rd on Android." >&2
  exit 1
fi

export NODE_BINARY="${NODE_BIN}"
export PATH="$(dirname "${NODE_BIN}"):${PATH}"

# Bun's npm-compat env vars confuse Gradle's autolinking shell-out.
while IFS='=' read -r env_name _; do
  unset "${env_name}"
done < <(env | awk -F= '/^npm_/ { print $1 }')

# Resolve Android SDK. Gradle won't pick up env-only ANDROID_HOME reliably
# when invoked through bun → npm-script → expo-cli, so we also write
# android/local.properties below. Accept either ANDROID_HOME or
# ANDROID_SDK_ROOT — Google renamed the latter as the canonical name but
# many setups still export only ANDROID_HOME (or vice versa).
if [ -z "${ANDROID_HOME:-}" ] && [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  export ANDROID_HOME="${ANDROID_SDK_ROOT}"
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "${HOME}/Library/Android/sdk" ]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "${ANDROID_HOME}" ]; then
  echo "Error: Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT, or install via Android Studio." >&2
  echo "  Expected default: ${HOME}/Library/Android/sdk" >&2
  exit 1
fi

export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb not on PATH. Install Android SDK platform-tools." >&2
  exit 1
fi

if [ ! -d "${ANDROID_DIR}" ]; then
  echo "Android project missing; generating native files with Expo prebuild..."
  npx expo prebuild --platform android --no-install
fi

# local.properties is gitignored and per-machine. Gradle reads sdk.dir from
# here before checking env vars — see native-rd-build skill Gotcha 7.
if [ ! -f "${ANDROID_DIR}/local.properties" ]; then
  echo "Writing android/local.properties with sdk.dir=${ANDROID_HOME}"
  printf 'sdk.dir=%s\n' "${ANDROID_HOME}" > "${ANDROID_DIR}/local.properties"
fi

# Require a connected emulator or device. `adb devices` lines after the
# header look like "<id>\tdevice" once authorized.
device_count="$(adb devices | awk 'NR>1 && $2=="device" { n++ } END { print n+0 }')"
if [ "${device_count}" -eq 0 ]; then
  echo "Error: no Android device/emulator connected." >&2
  echo "  Boot one from Android Studio (Device Manager → ▶) or plug in a device with USB debugging." >&2
  adb devices >&2 || true
  exit 1
fi
if [ "${device_count}" -gt 1 ] && [ -z "${ANDROID_DEVICE_ID:-}" ]; then
  echo "Error: multiple Android devices/emulators connected — set ANDROID_DEVICE_ID to pick one." >&2
  adb devices >&2 || true
  exit 1
fi

# Reverse the Metro port so the emulator/device can reach the host's bundler
# via localhost. Scope to the target device when ANDROID_DEVICE_ID is set so
# the reverse binds to the same device Expo will launch on. Idempotent.
echo "Reversing tcp:8081 to host..."
if [ -n "${ANDROID_DEVICE_ID:-}" ]; then
  adb -s "${ANDROID_DEVICE_ID}" reverse tcp:8081 tcp:8081 >/dev/null
else
  adb reverse tcp:8081 tcp:8081 >/dev/null
fi

# Pin packager host to localhost. Combined with `adb reverse` above, this
# makes Metro reachable from emulators AND USB-connected devices without
# depending on the host's LAN IP.
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-localhost}"

echo "Launching Android app with Expo..."

if [ -n "${ANDROID_DEVICE_ID:-}" ]; then
  exec npx expo run:android --device "${ANDROID_DEVICE_ID}" "$@"
fi

exec npx expo run:android "$@"
