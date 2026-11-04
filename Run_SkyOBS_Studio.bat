@echo off
chcp 65001 >nul
title SkyOBS Studio - Simple YouTube Video Streamer
cd /d "%~dp0"

echo ======================================================================
echo                  [+] LAUNCHING SKYOBS STUDIO
echo         OBS-Style Simple YouTube Video Streamer for Local Videos
echo ======================================================================
echo.
echo [1/2] Checking Python Virtual Environment...

if exist "..\.venv\Scripts\python.exe" (
    echo [2/2] Starting SkyOBS Studio Engine via Workspace .venv...
    "..\.venv\Scripts\python.exe" app.py
) else if exist ".venv\Scripts\python.exe" (
    echo [2/2] Starting SkyOBS Studio Engine...
    ".venv\Scripts\python.exe" app.py
) else (
    echo [2/2] Starting SkyOBS Studio Engine via System Python...
    python app.py
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Process stopped or encountered an issue.
    pause
)
