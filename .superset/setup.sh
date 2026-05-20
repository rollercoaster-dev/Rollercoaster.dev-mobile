#!/usr/bin/env bash
set -euo pipefail

echo "▶ Provisioning workspace: ${SUPERSET_WORKSPACE_NAME:-unknown}"

if [ -n "${SUPERSET_ROOT_PATH:-}" ]; then
  for env_file in \
    ".env" \
    ".env.local" \
    "apps/native-rd/.env" \
    "apps/native-rd/.env.local"
  do
    if [ -f "$SUPERSET_ROOT_PATH/$env_file" ]; then
      mkdir -p "$(dirname "$env_file")"
      cp "$SUPERSET_ROOT_PATH/$env_file" "$env_file"
      echo "  copied $env_file"
    fi
  done
fi

echo "▶ bun install"
bun install --frozen-lockfile

echo "▶ bun run build"
bun run build

echo "✓ Workspace ready"
