@echo off
echo.
echo ========================================
echo    Installing claude-intent...
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -e "console.log(process.versions.node)"') do set NODE_VER=%%i
echo Found Node.js %NODE_VER%

:: Install dependencies
echo.
echo Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

:: Install globally
echo Installing claude-intent globally...
call npm install -g .
if %errorlevel% neq 0 (
    echo.
    echo Could not install globally. Trying local install...
    :: Fallback: run directly
    echo @echo off > "%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\claude-intent.cmd"
    echo node "%~dp0bin\claude-intent.js" %%* >> "%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\claude-intent.cmd"
    echo Installed as claude-intent.cmd
)

echo.
echo ========================================
echo    Installation complete!
echo ========================================
echo.
echo Next step - run setup:
echo    claude-intent setup
echo.
pause
