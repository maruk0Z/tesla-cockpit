@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%"

:restart
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%rotate-logs.ps1" -Root "%ROOT%"
node.exe server.js 1>>"%ROOT%tesla-cockpit.log" 2>>"%ROOT%tesla-cockpit.err.log"
if errorlevel 1 echo [%date% %time%] Node exited with code %errorlevel%, restarting in 10 seconds.>>"%ROOT%tesla-cockpit.err.log"
timeout /t 10 /nobreak >nul
goto restart
