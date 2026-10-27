#!/bin/bash
set -Eeuo pipefail
cd "${COZE_WORKSPACE_PATH:-$(pwd)}"
pnpm install --frozen-lockfile
