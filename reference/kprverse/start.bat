@echo off
cd /d "%~dp0"
echo ============================================
echo   Mornikar Portfolio - KPR Verse Mirror
echo   http://localhost:5679/
echo ============================================
echo.
set "NODE_EXE=D:\Auxiliary_means\Nodejs\node.exe"
if exist "%NODE_EXE%" (
  "%NODE_EXE%" server.js
) else (
  node server.js
)
pause