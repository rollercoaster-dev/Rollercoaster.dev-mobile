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
#   SENTRY_DISABLE_AUTO_UPLOAD=1   Skip Sentry sourcemap upload (use when the
#                                   keychain token is rotated/missing).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${APP_DIR}"

platform="${1:-android}"
profile="${2:-preview}"

# Pre-flight: SpinDrive must be the actual external volume. If it isn't
# mounted, /Volumes/SpinDrive can be a regular dir on the system SSD — which
# would defeat the entire point of redirecting the workingdir.
SPINDRIVE_MOUNT="/Volumes/SpinDrive"
SPINDRIVE_EXPECTED_FS="/dev/disk8s1"

actual_fs="$(df "${SPINDRIVE_MOUNT}" 2>/dev/null | awk 'NR==2 {print $1}')"
if [ "${actual_fs}" != "${SPINDRIVE_EXPECTED_FS}" ]; then
  echo "Error: ${SPINDRIVE_MOUNT} is not mounted on ${SPINDRIVE_EXPECTED_FS} (got '${actual_fs:-nothing}')." >&2
  echo "  Mount SpinDrive before running EAS local builds." >&2
  exit 1
fi

WORKDIR="${SPINDRIVE_MOUNT}/caches/eas-build-local"
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
if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  if security find-generic-password -s SENTRY_AUTH_TOKEN -w >/dev/null 2>&1; then
    SENTRY_AUTH_TOKEN="$(security find-generic-password -s SENTRY_AUTH_TOKEN -w)"
    export SENTRY_AUTH_TOKEN
  elif [ "${SENTRY_DISABLE_AUTO_UPLOAD:-0}" = "0" ]; then
    echo "Error: SENTRY_AUTH_TOKEN not in Keychain and not in env." >&2
    echo "  Add one: security add-generic-password -a \"\$USER\" -s SENTRY_AUTH_TOKEN -U -w" >&2
    echo "  Or skip Sentry upload: SENTRY_DISABLE_AUTO_UPLOAD=1 $0 $*" >&2
    exit 1
  fi
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
# passwords + alias. Pattern matches `<pkg>@<ver> <base64≥100 chars>`.
redact() {
  awk '{
    gsub(/eas-cli-local-build-plugin@[0-9.]+ [A-Za-z0-9+\/=]{100,}/,
         "eas-cli-local-build-plugin@<ver> [REDACTED EAS PAYLOAD]");
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
