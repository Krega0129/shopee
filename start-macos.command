#!/bin/zsh

set -e

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

print_line() {
  printf '%s\n' "$1"
}

pause_on_error() {
  print_line ""
  print_line "启动失败。请查看上方错误信息，然后按回车键关闭窗口。"
  read -r
}

trap pause_on_error ERR

print_line "=========================================="
print_line " Shopee Ledger 本地启动器（macOS）"
print_line "=========================================="

if ! command -v node >/dev/null 2>&1; then
  print_line "未检测到 Node.js。"
  print_line "请先安装 Node.js 20 或更高版本：https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( NODE_MAJOR < 20 )); then
  print_line "当前 Node.js 版本为 $(node --version)，本项目要求 Node.js 20 或更高版本。"
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
elif command -v npx >/dev/null 2>&1; then
  PNPM_CMD=(npx -y pnpm@11.19.0)
else
  print_line "未检测到 pnpm、Corepack 或 npx。请重新安装 Node.js 20+。"
  exit 1
fi

print_line "Node.js: $(node --version)"
print_line "包管理器: $(${PNPM_CMD[@]} --version)"

if [[ ! -f "apps/api/.env" ]]; then
  cp ".env.example" "apps/api/.env"
  print_line "已创建 apps/api/.env"
fi

print_line "正在检查并安装依赖……"
${PNPM_CMD[@]} install --frozen-lockfile

print_line "正在初始化/升级 SQLite 数据库……"
${PNPM_CMD[@]} --filter @shopee/api prisma db push

if curl --silent --fail "http://127.0.0.1:5173" >/dev/null 2>&1 && curl --silent --fail "http://127.0.0.1:3000/api/products" >/dev/null 2>&1; then
  print_line "项目已经在运行，正在打开浏览器。"
  open "http://127.0.0.1:5173"
  trap - ERR
  exit 0
fi

(
  for _ in {1..60}; do
    if curl --silent --fail "http://127.0.0.1:5173" >/dev/null 2>&1; then
      open "http://127.0.0.1:5173"
      exit 0
    fi
    sleep 1
  done
) &

print_line ""
print_line "正在启动系统……"
print_line "前端：http://127.0.0.1:5173"
print_line "API：http://127.0.0.1:3000/api"
print_line ""
print_line "请保持此窗口开启。按 Control + C 可停止系统。"
print_line "=========================================="

trap - ERR
exec ${PNPM_CMD[@]} -r --parallel dev
