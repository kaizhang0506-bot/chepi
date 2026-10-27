#!/bin/bash
set -Eeuo pipefail
cd "${COZE_WORKSPACE_PATH:-$(pwd)}"
pnpm exec next dev --webpack --hostname 0.0.0.0 --port "${DEPLOY_RUN_PORT:-5000}"
