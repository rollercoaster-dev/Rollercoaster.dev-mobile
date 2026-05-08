#!/usr/bin/env bash
# Build a fresh iOS production archive and submit that exact build to TestFlight.
#
# Do not replace this with `eas submit --latest`: App Store Connect rejects
# re-uploading an IPA whose CFBundleVersion was already used for the same app
# version. `eas build --auto-submit` keeps the fresh auto-incremented build and
# its submission tied together.

set -euo pipefail

if ! command -v eas >/dev/null 2>&1; then
  echo "Error: eas-cli is required. Install with: npm install -g eas-cli" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: commit or stash tracked changes before starting a TestFlight build." >&2
  echo "EAS is configured with requireCommit=true, and release builds should be reproducible." >&2
  exit 1
fi

args=(
  build
  --platform ios
  --profile production
  --auto-submit
  --non-interactive
  --wait
)

if [ -n "${WHAT_TO_TEST:-}" ]; then
  args+=(--what-to-test "${WHAT_TO_TEST}")
fi

echo "This will start a new EAS iOS production build and auto-submit it to TestFlight."
echo "It consumes one iOS EAS build and avoids duplicate App Store Connect build numbers."

if [ "${YES:-}" != "1" ] && [ "${CI:-}" != "1" ]; then
  read -r -p "Continue? [y/N] " answer
  case "${answer}" in
    y|Y|yes|YES) ;;
    *) echo "Canceled."; exit 0 ;;
  esac
fi

exec eas "${args[@]}"
