#!/usr/bin/env bash

set -euo pipefail

if ! command -v maestro >/dev/null 2>&1; then
  echo "Skipping native-rd E2E: Maestro CLI is not installed in this environment."
  exit 0
fi

maestro test e2e/flows/
