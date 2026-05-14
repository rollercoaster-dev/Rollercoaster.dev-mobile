#!/usr/bin/env bash
# EAS local build wrapper for native-rd. Builds APK/AAB/IPA off the system SSD
# by pointing EAS_LOCAL_BUILD_WORKINGDIR at /Volumes/SpinDrive, fetches
# SENTRY_AUTH_TOKEN from macOS Keychain so the Gradle Sentry-upload task can
# authenticate, and redacts the base64 build payload (which inlines the
# Android keystore) from stderr so a failure doesn't leak signing material
# into terminal scrollback.
#
# Usage:
#   run-eas-local.sh [platform] [profile]
#   run-eas-local.sh android preview        # default
#   run-eas-local.sh android production
#   run-eas-local.sh ios preview
#
# Env overrides:
#   EAS_LOCAL_BUILD_VOLUME         Mountpoint to use for the workingdir.
#                                   Defaults to /Volumes/SpinDrive.
#   SENTRY_DISABLE_AUTO_UPLOAD=1   Skip Sentry sourcemap upload (use when the
#                                   keychain token is rotated/missing).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${APP_DIR}"

platform="${1:-android}"
profile="${2:-preview}"

# Pre-flight: the target volume must be a separate mounted filesystem. If it
# isn't, the path can resolve to a regular dir on the system SSD — which would
# defeat the entire point of redirecting the workingdir. Compare filesystem
# device numbers (stat -f '%d') instead of hardcoding a device path like
# /dev/disk8s1: macOS disk identifiers are unstable across reboots and depend
# on USB attach order.
VOLUME_MOUNT="${EAS_LOCAL_BUILD_VOLUME:-/Volumes/SpinDrive}"

if [ ! -d "${VOLUME_MOUNT}" ]; then
  echo "Error: ${VOLUME_MOUNT} does not exist." >&2
  echo "  Mount it (or set EAS_LOCAL_BUILD_VOLUME) before running EAS local builds." >&2
  exit 1
fi

root_fsid="$(stat -f '%d' /)"
mount_fsid="$(stat -f '%d' "${VOLUME_MOUNT}" 2>/dev/null || true)"
if [ -z "${mount_fsid}" ] || [ "${mount_fsid}" = "${root_fsid}" ]; then
  echo "Error: ${VOLUME_MOUNT} is not a separate mounted filesystem (same device as /)." >&2
  echo "  The path exists but resolves to the system disk — mount the external volume first." >&2
  exit 1
fi

WORKDIR="${VOLUME_MOUNT}/caches/eas-build-local"
ARTIFACT_DIR="${WORKDIR}/artifacts"
mkdir -p "${WORKDIR}" "${ARTIFACT_DIR}"
export EAS_LOCAL_BUILD_WORKINGDIR="${WORKDIR}"

# Bun's npm-compat env vars confuse Gradle's autolinking shell-out when EAS
# invokes gradlew through the bun-managed PATH. Same fix as run-android.sh.
while IFS='=' read -r env_name _; do
  unset "${env_name}"
done < <(env | awk -F= '/^npm_/ { print $1 }')

# Fetch SENTRY_AUTH_TOKEN from Keychain. Never echoed. If neither in env nor
# keychain AND user hasn't opted out, fail loud — silently producing a build
# without sourcemap upload would let crashes ship unsymbolicated.
# Skip the Keychain lookup entirely when SENTRY_DISABLE_AUTO_UPLOAD=1 — the
# opt-out flag should not export the token into the build environment.
if [ "${SENTRY_DISABLE_AUTO_UPLOAD:-0}" = "0" ] && [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  if token="$(security find-generic-password -s SENTRY_AUTH_TOKEN -w 2>/dev/null)" && [ -n "${token}" ]; then
    SENTRY_AUTH_TOKEN="${token}"
    export SENTRY_AUTH_TOKEN
  else
    echo "Error: SENTRY_AUTH_TOKEN not in Keychain and not in env." >&2
    echo "  Add one: security add-generic-password -a \"\$USER\" -s SENTRY_AUTH_TOKEN -U -w" >&2
    echo "  Or skip Sentry upload: SENTRY_DISABLE_AUTO_UPLOAD=1 $0 $*" >&2
    exit 1
  fi
  unset token
fi

sha="$(git -C "${APP_DIR}" rev-parse --short HEAD 2>/dev/null || echo nogit)"
case "${platform}-${profile}" in
  android-production) ext="aab" ;;
  android-*)          ext="apk" ;;
  ios-*)              ext="ipa" ;;
  *)
    echo "Error: unsupported platform '${platform}' (expected: android, ios)." >&2
    exit 1
    ;;
esac
artifact="${ARTIFACT_DIR}/native-rd-${platform}-${profile}-${sha}.${ext}"

# Redact the base64 payload printed by eas-cli-local-build-plugin when its
# subprocess exits non-zero — the payload inlines the Android keystore + key
# passwords + alias. Two passes: (1) the known leak shape if the plugin name
# is still in the line, (2) any standalone long base64 run as defense-in-depth
# if EAS ever changes its log format (newlines, scoped package name, etc.).
redact() {
  awk '{
    gsub(/eas-cli-local-build-plugin@[0-9.]+ [A-Za-z0-9+\/=]{100,}/,
         "eas-cli-local-build-plugin@<ver> [REDACTED EAS PAYLOAD]");
    gsub(/[A-Za-z0-9+\/=]{200,}/, "[REDACTED BASE64]");
    print;
    fflush();
  }'
}

echo "▸ EAS local build: ${platform} / ${profile}"
echo "  workingdir: ${WORKDIR}"
echo "  artifact:   ${artifact}"
echo

exec eas build \
  --platform "${platform}" \
  --profile "${profile}" \
  --local \
  --non-interactive \
  --output "${artifact}" 2>&1 | redact
