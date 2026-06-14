@echo off
title 黑平线：原体觉醒
cd /d "%~dp0.."

echo 正在启动中...
echo 如果此窗口没有闪退，请等待浏览器打开。

REM 尝试后台运行 Python 服务器
start /B python -m http.server 8080 >nul 2>&1

REM 稍等片刻
timeout /t 2 /nobreak >nul

REM 打开网页
start http://localhost:8080/HTML/index.html

echo.
echo 游戏已启动！
echo 如果浏览器没有自动打开，请手动访问: http://localhost:8080/HTML/index.html
echo.
pause
