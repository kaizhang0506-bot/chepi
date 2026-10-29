#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -d node_modules/vinext ]; then
  echo "[ensure-deps] node_modules missing, installing dependencies..."
  pnpm install --frozen-lockfile
fi
