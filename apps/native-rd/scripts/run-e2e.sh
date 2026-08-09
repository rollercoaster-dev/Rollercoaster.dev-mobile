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
APP_BUNDLE_ID="dev.rollercoaster.app"
if xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  xcrun simctl spawn booted defaults write \
    "${APP_BUNDLE_ID}" EXDevMenuIsOnboardingFinished -bool YES

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
  echo "warning: no booted simulator; EXDevMenuIsOnboardingFinished and AppleLanguages not pre-seeded" >&2
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
maestro test "$@" \
  --format junit \
  --output "${REPORT_DIR}/junit.xml" \
  e2e/flows/
