#!/usr/bin/env bash

set -euo pipefail

# Fail hard when Maestro is missing.
#
# This script used to `exit 0` here, which meant a machine without the CLI
# reported a green E2E suite having launched nothing — the exact hazard recorded
# in docs/plans/active/mac-mini-e2e-runner.md. A missing test runner is a broken
# environment, not a pass.
#
# `E2E_ALLOW_MISSING_MAESTRO=1` is the deliberate opt-out for environments that
# genuinely cannot run it (a CI lane that only type-checks, say). It has to be
# asked for; it is never the default.
if ! command -v maestro >/dev/null 2>&1; then
  if [ "${E2E_ALLOW_MISSING_MAESTRO:-}" = "1" ]; then
    echo "Skipping native-rd E2E: Maestro CLI absent and E2E_ALLOW_MISSING_MAESTRO=1."
    exit 0
  fi
  echo "error: Maestro CLI is not installed — cannot run the native-rd E2E suite." >&2
  echo "       Install it (https://maestro.mobile.dev) or set E2E_ALLOW_MISSING_MAESTRO=1" >&2
  echo "       to acknowledge that this environment runs no E2E coverage at all." >&2
  exit 1
fi

# Lane selection. `--android` runs the suite against the connected Android
# device/emulator instead of the booted iOS simulator; every other argument is
# passed through to `maestro test` (e.g. `--include-tags required`).
#
# Local Android builds install the `.dev` package (APP_VARIANT=development is
# scripts/run-android.sh's default, see app.config.js), and Maestro's `appId:`
# cannot be interpolated from env. So the Android lane materialises a copy of
# the flows under e2e/.android/ (gitignored) with `appId:` rewritten, and points
# Maestro at that. Set APP_VARIANT to anything else to target the base package.
LANE="ios"
MAESTRO_ARGS=()
for arg in "$@"; do
  case "${arg}" in
    --android) LANE="android" ;;
    *) MAESTRO_ARGS+=("${arg}") ;;
  esac
done

APP_BUNDLE_ID="dev.rollercoaster.app"
FLOW_DIR="e2e/flows/"
ANDROID_PKG="${APP_BUNDLE_ID}"
ANDROID_SERIAL=""
LOCALE_LOOP_PID=""

cleanup() {
  if [ -n "${LOCALE_LOOP_PID}" ]; then
    kill "${LOCALE_LOOP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ "${LANE}" = "android" ]; then
  if ! command -v adb >/dev/null 2>&1; then
    echo "error: --android needs adb on PATH (Android SDK platform-tools)." >&2
    exit 1
  fi
  # One authorized device, or ANDROID_DEVICE_ID (same variable run-android.sh
  # honours) to pick among several. Maestro's --device takes the adb serial.
  if [ -n "${ANDROID_DEVICE_ID:-}" ]; then
    ANDROID_SERIAL="${ANDROID_DEVICE_ID}"
  else
    serials="$(adb devices | awk 'NR>1 && $2=="device" { print $1 }')"
    serial_count="$(printf '%s\n' "${serials}" | grep -c . || true)"
    if [ "${serial_count}" -eq 0 ]; then
      echo "error: --android given but no authorized Android device/emulator is connected." >&2
      adb devices >&2 || true
      exit 1
    fi
    if [ "${serial_count}" -gt 1 ]; then
      echo "error: several Android devices connected — set ANDROID_DEVICE_ID to the adb serial to run against." >&2
      adb devices >&2 || true
      exit 1
    fi
    ANDROID_SERIAL="${serials}"
  fi

  if [ "${APP_VARIANT:-development}" = "development" ]; then
    ANDROID_PKG="${APP_BUNDLE_ID}.dev"
    # The `.dev` build registers its own dev-client scheme so a phone that also
    # carries the store build gets no app chooser on the deep link
    # (app.config.js). The flows default `DEV_CLIENT_SCHEME` to
    # `exp+rollercoasterdev` in their `env:` block, and that default WINS over a
    # `maestro test -e` override (verified 2026-09-03: the chooser came back on
    # every flow), so the copy rewrites the default too.
    rm -rf e2e/.android
    mkdir -p e2e/.android
    cp -R e2e/flows e2e/subflows e2e/.android/
    for f in e2e/.android/flows/*.yaml e2e/.android/subflows/*.yaml; do
      sed -e "s/^appId: ${APP_BUNDLE_ID}\$/appId: ${ANDROID_PKG}/" \
          -e "s/^  DEV_CLIENT_SCHEME: exp+rollercoasterdev\$/  DEV_CLIENT_SCHEME: rollercoasterdev-dev/" \
          "${f}" > "${f}.tmp"
      mv "${f}.tmp" "${f}"
    done
    FLOW_DIR="e2e/.android/flows/"
  fi
  MAESTRO_ARGS+=(--device "${ANDROID_SERIAL}")

  if ! adb -s "${ANDROID_SERIAL}" shell pm path "${ANDROID_PKG}" >/dev/null 2>&1; then
    echo "error: ${ANDROID_PKG} is not installed on ${ANDROID_SERIAL}." >&2
    echo "       Build it with \`bun run android:e2e\` (Metro must stay up for the suite)." >&2
    exit 1
  fi

  # Pin the app's language to English, the Android counterpart of the
  # AppleLanguages seed below. Per-app locales (Android 13+) are stored in the
  # package's config, and Maestro's `clearState` is `pm clear`, which deletes
  # that config on EVERY flow — a one-shot seed is wiped before the first flow
  # even starts. So the seed is re-applied from a background loop for the
  # whole run. Setting an unchanged value is a no-op inside the framework
  # (no configuration change reaches the app), so the loop only acts in the
  # window between `pm clear` and the next cold start, which is exactly when
  # it has to. A device on any locale other than en-* fails the flows that
  # assert interpolated English a11y labels — as product regressions, not as
  # what they are.
  (
    while true; do
      adb -s "${ANDROID_SERIAL}" shell cmd locale set-app-locales "${ANDROID_PKG}" \
        --user 0 --locales en-US >/dev/null 2>&1 || true
      sleep 0.5
    done
  ) &
  LOCALE_LOOP_PID=$!

  # No dev-menu seed here, deliberately. The iOS UserDefaults trick has no
  # durable Android equivalent: expo-dev-menu keeps `isOnboardingFinished` in
  # the app's shared_prefs, which `pm clear` wipes every flow, and writing it
  # via `run-as` races the app's own first write. The prologue subflow treats
  # the sheet as a fixture and dismisses it in-flow (Android-only block).
fi

# Expo SDK 55 dev-client behavior: after Maestro's `clearState` reinstalls
# the app, the dev-client cold-launches into its server-picker UI rather
# than auto-loading the most recent bundle. Each flow's first step is an
# `openLink` to the dev-client deep-link scheme to skip the picker.
#
# A second hurdle: the very first launch shows an onboarding hint modal,
# and tapping its "Continue" button auto-opens the runtime dev menu —
# both modals occlude Maestro's a11y query. Pre-seeding
# `EXDevMenuIsOnboardingFinished=YES` in UserDefaults skips both. Maestro
# bug #1601 (https://github.com/mobile-dev-inc/maestro/issues/1601) means
# `clearState` does NOT clear UserDefaults on iOS, so a one-shot write
# here sticks for every flow that runs after.
if [ "${LANE}" = "android" ]; then
  : # simulator seeding is irrelevant on the Android lane
elif xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  xcrun simctl spawn booted defaults write \
    "${APP_BUNDLE_ID}" EXDevMenuIsOnboardingFinished -bool YES

  # …but that key only suppresses the onboarding *hint*. The dev menu itself
  # auto-opens because `EXDevMenuShowsAtLaunch` registers a default of `true` on
  # iOS (expo-dev-menu `DevMenuPreferences.setup()`), and the floating action
  # button registers `true` as well. Both are native overlays in a separate
  # window: Maestro's hierarchy dump does not show them, but they DO intercept
  # taps — so a flow fails with "element not found" while the element is right
  # there behind the modal. Turn both off.
  #
  # Do NOT use `EXDevMenuDisableAutoLaunch` for this: `readAutoLaunchDisabledState()`
  # removes the key as soon as it reads it, so it is a one-shot that only covers
  # the first flow in a suite.
  xcrun simctl spawn booted defaults write \
    "${APP_BUNDLE_ID}" EXDevMenuShowsAtLaunch -bool NO
  xcrun simctl spawn booted defaults write \
    "${APP_BUNDLE_ID}" EXDevMenuShowFloatingActionButton -bool NO

  # Pin the simulator language to English.
  #
  # Several flows assert interpolated English a11y labels ("1 of 3 steps done.
  # See all steps.", "Go to step 2: Charlie step", "Nest this step under …").
  # The app derives its language from the device via getLocales(), and `de`
  # ships — so a German simulator fails those steps in ways that read as
  # product regressions rather than a locale mismatch. Same UserDefaults
  # idiom as the dev-menu seed above.
  xcrun simctl spawn booted defaults write \
    "${APP_BUNDLE_ID}" AppleLanguages -array en
else
  echo "warning: no booted simulator; dev-menu suppression and AppleLanguages not pre-seeded" >&2
fi

# JUnit output is the artifact the visual/theme audit (#383) attaches to close
# out a run. e2e/README.md already documented this invocation; the script never
# actually used it.
REPORT_DIR="e2e/reports"
mkdir -p "${REPORT_DIR}"

# Flow selection comes from Maestro `tags:`, the single source of truth. Callers
# pass `--include-tags required` (see `test:e2e:required`); a bare run executes
# everything under e2e/flows/. e2e/subflows/ deliberately sits outside that
# directory so the shared prologue never runs as a top-level flow.
# On the Android lane FLOW_DIR is the appId-rewritten copy under e2e/.android/.
# The `${arr[@]+...}` form keeps `set -u` happy on an empty array (bash 3.2).
maestro test ${MAESTRO_ARGS[@]+"${MAESTRO_ARGS[@]}"} \
  --format junit \
  --output "${REPORT_DIR}/junit.xml" \
  "${FLOW_DIR}"
