#!/usr/bin/env bash
# 预览运行脚本：以生产模式启动（vinext start）。
# 原因：Next.js dev 模式的水合在平台预览代理（*.dev.coze.site）下会确定性挂死，
# 生产模式水合正常，因此预览链路统一走生产构建产物。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [ ! -d dist/server ]; then
  echo "[preview] 缺少生产构建产物，请先执行 scripts/preview-build.sh" >&2
  exit 1
fi

# 从 .preview 读取 expose_port，读取不到 fallback 5000
EXPOSE_PORT=$(awk -F '[ =]+' '/^expose_port/ {gsub(/[^0-9]/, "", $2); print $2; exit}' .preview 2>/dev/null || echo 5000)
[ -n "$EXPOSE_PORT" ] || EXPOSE_PORT=5000

# 清理同端口残留进程（绝不碰 9000）
PIDS=$(ss -lptn "sport = :${EXPOSE_PORT}" 2>/dev/null | grep -oE 'pid=[0-9]+' | grep -oE '[0-9]+' || true)
if [ -n "$PIDS" ]; then
  for p in $PIDS; do
    if [ "$p" != "$$" ]; then
      kill "$p" 2>/dev/null || true
    fi
  done
  sleep 1
fi

exec pnpm exec vinext start --port "$EXPOSE_PORT" --hostname 0.0.0.0
