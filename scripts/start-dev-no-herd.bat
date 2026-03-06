@echo off
setlocal

set "ROOT=%~dp0.."

if /I "%~1"=="--dry-run" (
    echo Backend : cd /d "%ROOT%" ^&^& php artisan serve --host=127.0.0.1 --port=8080 --tries=1 --no-reload
    echo Queue   : cd /d "%ROOT%" ^&^& php artisan queue:listen
    echo Frontend: cd /d "%ROOT%\frontend" ^&^& npm run dev
    exit /b 0
)

echo Starting OCC development stack without Herd...
echo.

start "OCC Backend (no Herd)" cmd /k "cd /d ""%ROOT%"" && php artisan serve --host=127.0.0.1 --port=8080 --tries=1 --no-reload"
start "OCC Queue" cmd /k "cd /d ""%ROOT%"" && php artisan queue:listen"
start "OCC Frontend" cmd /k "cd /d ""%ROOT%\frontend"" && npm run dev"

echo Opened 3 terminals:
echo - Backend : http://127.0.0.1:8080
echo - Frontend: http://localhost:3000
echo.
echo API URL in frontend/.env.local now points to http://127.0.0.1:8080/api

