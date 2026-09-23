@echo off
rem Starts the hydra preset server (Hydra\serve-presets.mjs) on http://localhost:8080
rem The TouchDesigner wall (webrender1) loads its /split page from there.
rem Close this window (or press Ctrl+C) to stop the server.

setlocal
cd /d "%~dp0Hydra"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found on PATH. Install it from https://nodejs.org and try again.
    pause
    exit /b 1
)

netstat -ano | findstr /r /c:"TCP.*:8080 .*LISTENING" >nul
if not errorlevel 1 (
    echo Port 8080 is already in use -- the hydra server is probably running already.
    echo Open http://localhost:8080/ to check. Close the other server first to restart it.
    pause
    exit /b 1
)

title hydra preset server
echo Starting the hydra preset server on http://localhost:8080/ ...
echo.
node serve-presets.mjs
echo.
echo The server stopped.
pause
