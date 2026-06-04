#!/usr/bin/env bash
set -euo pipefail

echo "▶ Provisioning workspace: ${SUPERSET_WORKSPACE_NAME:-unknown}"

if [ -n "${SUPERSET_ROOT_PATH:-}" ]; then
  env_file="apps/native-rd/.env.local"
  if [ -f "$SUPERSET_ROOT_PATH/$env_file" ]; then
    mkdir -p "$(dirname "$env_file")"
    cp "$SUPERSET_ROOT_PATH/$env_file" "$env_file"
    echo "  copied $env_file"
  fi
fi

echo "▶ bun install"
bun install --frozen-lockfile

echo "▶ bun run build"
bun run build

echo "✓ Workspace ready"
