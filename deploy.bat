@echo off
chcp 65001 >nul
title 一键部署到 Render - 永久公网访问

echo ============================================
echo   一键部署到 Render 云平台
echo   部署后获得永久公网地址!
echo ============================================
echo.

REM 设置 PATH 包含 gh CLI
set PATH=%PATH%;%ProgramFiles%\GitHub CLI

REM 步骤1: 检查 GitHub 登录
echo [1/4] 检查 GitHub 登录状态...
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo 需要先登录 GitHub。正在打开浏览器...
    echo 请在浏览器中完成登录，然后回到这里。
    echo.
    gh auth login --web --hostname github.com
    if %errorlevel% neq 0 (
        echo 登录失败。请手动运行: gh auth login --web
        pause
        exit /b 1
    )
)
echo [OK] GitHub 已登录

REM 步骤2: 推送代码到 GitHub
echo.
echo [2/4] 推送代码到 GitHub...

REM 检查是否已有 remote
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo 创建 GitHub 仓库...
    gh repo create script-generator --public --source . --remote origin --push
    if %errorlevel% neq 0 (
        echo 仓库创建失败，请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo 远程仓库已存在，推送更新...
    git push -u origin master
)
echo [OK] 代码已推送到 GitHub

REM 步骤3: 提示部署
echo.
echo [3/4] 准备 Render 部署...
echo.
echo ============================================
echo   现在需要你手动操作 (2分钟):
echo.
echo   1. 打开浏览器访问: https://render.com
echo   2. 点击 "Sign Up" 用 GitHub 账号注册
echo   3. 登录后点击 "New +" -> "Web Service"
echo   4. 选择刚才创建的 script-generator 仓库
echo   5. Render 会自动读取 render.yaml 配置
echo   6. 点击 "Create Web Service"
echo.
echo   部署约需5分钟，完成后你会获得:
echo   https://script-generator.onrender.com
echo.
echo   这就是永久公网地址! 永不改变!
echo ============================================
echo.
pause

REM 步骤4: 打开浏览器
echo.
echo [4/4] 打开相关网页...
start https://render.com
start https://github.com

echo.
echo 部署完成后，你的永久公网地址将是:
echo https://YOUR-APP.onrender.com
echo.
pause
