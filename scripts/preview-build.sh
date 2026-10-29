#!/usr/bin/env bash
# 预览构建脚本：安装依赖 + 生产构建（供 .coze [dev].build 使用）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

pnpm install --frozen-lockfile
pnpm run build
