@echo off
cd /d "%~dp0app"
if not defined BOOGIE_PORT set "BOOGIE_PORT=8788"
where node >nul 2>nul
if not errorlevel 1 goto run
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs --open
  goto end
)
echo Install Node.js 22 or newer from https://nodejs.org then run this file again.
pause
exit /b 1
:run
node server.mjs --open
:end
pause
