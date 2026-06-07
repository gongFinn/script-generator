@echo off
chcp 65001 >nul
title 改编你爱的小说 - 全栈启动

echo ============================================
echo   改编你爱的小说 - 启动中...
echo ============================================
echo.

REM 设置环境变量
set DEEPSEEK_API_KEY=sk-f11acd266cc64e72961fe7caef4b9bd8
echo [OK] API Key 已配置

REM ============ 1. 后端 ============
echo.
echo [1/4] 启动后端服务 (端口 8000)...
cd /d "%~dp0backend"
start "Backend API" cmd /c "title Backend API ^&^& pip install -r requirements.txt -q ^&^& python main.py"
cd /d "%~dp0"

REM ============ 2. 前端构建 ============
echo [2/4] 构建前端...
cd /d "%~dp0frontend"
call npm install --silent 2>nul
call npx vite build 2>nul
cd /d "%~dp0"
echo [OK] 前端已构建

REM 等待后端就绪
echo [3/4] 等待后端就绪...
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% neq 0 goto wait_backend
echo [OK] 后端已就绪

REM ============ 3. 公网隧道 ============
echo [4/4] 启动公网隧道...

REM 尝试多种方式启动 cloudflared
set CLOUDFLARED=
for /f "delims=" %%i in ('where cloudflared 2^>nul') do set CLOUDFLARED=%%i
if "%CLOUDFLARED%"=="" (
    for /r "%LOCALAPPDATA%\Microsoft\WinGet\Packages" %%i in (cloudflared.exe) do set CLOUDFLARED=%%i
)

if not "%CLOUDFLARED%"=="" (
    start "Cloudflare Tunnel" cmd /c "title Cloudflare Tunnel ^&^& "%CLOUDFLARED%" tunnel --url http://localhost:8000"
    echo [OK] Cloudflare Tunnel 已启动
) else (
    echo [WARN] 未找到 cloudflared，跳过
)

REM serveo SSH 备份隧道
start "Serveo Backup" cmd /c "title Serveo Backup Tunnel ^&^& ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:8000 serveo.net"
echo [OK] Serveo 备份隧道已启动

REM ============ 完成 ============
echo.
echo ============================================
echo   系统启动完成!
echo.
echo   本地访问:  http://localhost:8000
echo   API 文档:  http://localhost:8000/docs
echo.
echo   公网地址请查看以下窗口:
echo   - [Cloudflare Tunnel] 窗口
echo   - [Serveo Backup Tunnel] 窗口
echo   (URL 格式: https://xxxxx.trycloudflare.com)
echo.
echo   公网地址也会显示在网站首页顶部
echo ============================================
echo.
echo 按任意键打开本地网页...
pause >nul
start http://localhost:8000
