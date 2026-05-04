@echo off
title Beijing-Axis GitHub Deploy

cd /d "%~dp0"

echo.
echo ========================================
echo   Beijing Axis - GitHub Pages Deploy
echo ========================================
echo.

echo [1/5] Checking gh CLI...
"C:\Program Files\GitHub CLI\gh.exe" --version
if errorlevel 1 (
    echo [ERROR] gh CLI not found.
    echo Run in Admin PowerShell: winget install GitHub.cli
    pause
    exit /b 1
)

echo.
echo [2/5] GitHub Auth...
echo   A browser will open - click Authorize button.
"C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com
if errorlevel 1 (
    echo [ERROR] Auth failed. Try again.
    pause
    exit /b 1
)
echo [OK] Auth succeeded

echo.
echo [3/5] Creating repo...
"C:\Program Files\GitHub CLI\gh.exe" repo create beijing-central-axis --public --source . --remote origin
if errorlevel 1 (
    echo [ERROR] Repo create failed
    pause
    exit /b 1
)
echo [OK] Repo created

echo.
echo [4/5] Checking git branch...
git branch -M main
if errorlevel 1 (
    echo [ERROR] Git branch rename failed
    pause
    exit /b 1
)

echo.
echo [5/5] Pushing code to remote...
git push -u origin main
if errorlevel 1 (
    echo [ERROR] Git push failed
    pause
    exit /b 1
)
echo [OK] Code pushed

echo.
echo Enabling GitHub Pages...
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
