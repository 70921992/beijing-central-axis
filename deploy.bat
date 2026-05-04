@echo off
title Beijing-Axis GitHub Deploy

cd /d "%~dp0"

echo.
echo ========================================
echo   Beijing Axis - GitHub Pages Deploy
echo ========================================
echo.

echo [1/4] Checking gh CLI...
"C:\Program Files\GitHub CLI\gh.exe" --version
if errorlevel 1 (
    echo [ERROR] gh CLI not found.
    echo Run in Admin PowerShell: winget install GitHub.cli
    pause
    exit /b 1
)

echo.
echo [2/4] GitHub Auth...
echo   A browser will open - click Authorize button.
"C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com
if errorlevel 1 (
    echo [ERROR] Auth failed. Try again.
    pause
    exit /b 1
)
echo [OK] Auth succeeded

echo.
echo [3/4] Creating repo and pushing...
"C:\Program Files\GitHub CLI\gh.exe" repo create beijing-central-axis --public --push --source . --remote origin --branch main
if errorlevel 1 (
    echo [ERROR] Repo create/push failed
    pause
    exit /b 1
)
echo [OK] Repo created and code pushed

echo.
echo [4/4] Enabling GitHub Pages...
"C:\Program Files\GitHub CLI\gh.exe" repo view --json nameWithOwner -q .nameWithOwner > temp_repo.txt
set /p REPO=<temp_repo.txt
del temp_repo.txt
"C:\Program Files\GitHub CLI\gh.exe" api repos/%REPO%/pages -X POST -f source[branch]=main -f source[path]=/
echo [OK] GitHub Pages enabled

echo.
echo ========================================
echo   Done!
for /f "tokens=1 delims=/" %%a in ("%REPO%") do set UN=%%a
echo   Repo: %REPO%
echo   URL:  https://%UN%.github.io/beijing-central-axis/
echo.
echo   Wait 1-2 minutes for the site to go live.
echo ========================================
pause
