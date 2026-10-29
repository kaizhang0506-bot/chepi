#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

EXPOSE_PORT="${DEPLOY_RUN_PORT:-5000}"

echo "Starting production server on 0.0.0.0:${EXPOSE_PORT} for deploy..."
exec pnpm exec vinext start --port "${EXPOSE_PORT}" --hostname 0.0.0.0
