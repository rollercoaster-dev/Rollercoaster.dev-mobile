#!/usr/bin/env bash
set -euo pipefail

# The repo-level bunfig forces package CLIs through Bun by prepending a
# Bun-provided `node` shim to PATH. Jest needs real Node here.
clean_path=""
IFS=":"
for path_entry in ${PATH:-}; do
  case "$path_entry" in
    */bun-node-*) continue ;;
  esac

  if [ -z "$clean_path" ]; then
    clean_path="$path_entry"
  else
    clean_path="$clean_path:$path_entry"
  fi
done
unset IFS

export PATH="$clean_path"
unset NODE npm_node_execpath
export NODE_ENV="test"

node_bin="$(command -v node)"
if command -v mise >/dev/null 2>&1; then
  mise_node="$(mise which node 2>/dev/null || true)"
  if [ -n "$mise_node" ]; then
    node_bin="$mise_node"
  fi
fi

exec "$node_bin" node_modules/.bin/jest "$@"
