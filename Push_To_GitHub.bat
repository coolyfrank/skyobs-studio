@echo off
title Push SkyOBS Studio to GitHub for 24/7 Cloud Hosting
cd /d "%~dp0"

echo ======================================================================
echo          🚀 PUSH SKYOBS STUDIO TO GITHUB FOR 24/7 CLOUD HOSTING
echo ======================================================================
echo.
echo 1. Go to https://github.com/new and create a new repository called:
echo    skyobs-studio
echo.
echo 2. Paste your repository URL below (e.g. https://github.com/YourName/skyobs-studio.git):
set /p REPO_URL="Repository URL: "

if "%REPO_URL%"=="" (
    echo [!] No URL provided. Aborting.
    pause
    exit /b
)

echo.
echo [1/3] Setting git remote...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [2/3] Setting default branch to main...
git branch -M main

echo [3/3] Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==================================================================
    echo ✅ SUCCESS! Code is now on GitHub!
    echo.
    echo NEXT STEP TO RUN 24/7 WITH LAPTOP OFF:
    echo 1. Go to https://render.com or https://railway.app
    echo 2. Click "New Web Service" and select "skyobs-studio"
    echo 3. Click Deploy!
    echo.
    echo You will get a permanent public link you can use from your phone 24/7!
    echo ==================================================================
) else (
    echo.
    echo [!] Push failed. Check your GitHub repository permissions or credentials.
)

pause
