#!/usr/bin/env bash

set -euo pipefail

if ! command -v maestro >/dev/null 2>&1; then
  echo "Skipping native-rd E2E: Maestro CLI is not installed in this environment."
  exit 0
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
else
  echo "warning: no booted simulator; EXDevMenuIsOnboardingFinished not pre-seeded" >&2
fi

maestro test e2e/flows/
