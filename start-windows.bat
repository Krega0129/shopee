@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo  Shopee Ledger 本地启动器（Windows）
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js。
  echo 请先安装 Node.js 20 或更高版本：https://nodejs.org/
  goto :error
)

for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set "NODE_MAJOR=%%v"
for /f %%v in ('node --version') do set "NODE_VERSION=%%v"
if %NODE_MAJOR% LSS 20 (
  echo 当前 Node.js 版本为 %NODE_VERSION%，本项目要求 Node.js 20 或更高版本。
  goto :error
)

where pnpm >nul 2>nul
if not errorlevel 1 (
  set "PNPM_CMD=pnpm"
  goto :manager_ready
)

where corepack >nul 2>nul
if not errorlevel 1 (
  set "PNPM_CMD=corepack pnpm"
  goto :manager_ready
)

where npx >nul 2>nul
if not errorlevel 1 (
  set "PNPM_CMD=npx -y pnpm@11.19.0"
  goto :manager_ready
)

echo 未检测到 pnpm、Corepack 或 npx。请重新安装 Node.js 20+。
goto :error

:manager_ready
echo Node.js: %NODE_VERSION%
call %PNPM_CMD% --version
if errorlevel 1 goto :error

if not exist "apps\api\.env" (
  copy /Y ".env.example" "apps\api\.env" >nul
  echo 已创建 apps\api\.env
)

echo 正在检查并安装依赖……
call %PNPM_CMD% install --frozen-lockfile
if errorlevel 1 goto :error

echo 正在初始化/升级 SQLite 数据库……
call %PNPM_CMD% --filter @shopee/api prisma db push
if errorlevel 1 goto :error

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173 -TimeoutSec 2 ^| Out-Null; Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/products -TimeoutSec 2 ^| Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo 项目已经在运行，正在打开浏览器。
  start "" "http://127.0.0.1:5173"
  exit /b 0
)

start "Shopee Ledger Browser" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://127.0.0.1:5173'"

echo.
echo 正在启动系统……
echo 前端：http://127.0.0.1:5173
echo API：http://127.0.0.1:3000/api
echo.
echo 请保持此窗口开启。按 Ctrl+C 可停止系统。
echo ==========================================

call %PNPM_CMD% -r --parallel dev
goto :eof

:error
echo.
echo 启动失败。请查看上方错误信息。
pause
exit /b 1
