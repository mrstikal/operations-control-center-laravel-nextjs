@echo off
REM Start Development Server for OCC

echo 🚀 Operations Control Center - Development Server
echo ================================================
echo.

REM Check if running from correct directory
if not exist "public\index.php" (
    echo Error: Run this from F:\laravel\operations-control-center
    exit /b 1
)

REM Colors
echo [*] Starting PHP Development Server...
echo.

REM Start PHP Server
php -S 127.0.0.1:8000 -t public

echo.
echo Server stopped.

