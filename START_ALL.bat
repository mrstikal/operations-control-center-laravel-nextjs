@echo off
REM Operations Control Center - Complete Startup Script for Windows

echo.
echo ================================================
echo  🚀 Operations Control Center - Startup
echo ================================================
echo.

REM 1. Docker
echo [1/3] Starting Docker services (PostgreSQL, Redis, Mailhog)...
docker-compose up -d
echo ✅ Docker services started
echo.

REM 2. Backend
echo [2/3] Starting PHP Backend Server (port 9000)...
start "OCC Backend" cmd /k "cd /d F:\laravel\operations-control-center && php -S localhost:9000 -t public"
timeout /t 2
echo ✅ Backend started on http://localhost:9000/api
echo.

REM 3. Frontend
echo [3/3] Starting Next.js Frontend (port 3000)...
start "OCC Frontend" cmd /k "cd /d F:\laravel\operations-control-center\frontend && npm run dev"
timeout /t 3
echo ✅ Frontend started on http://localhost:3000
echo.

REM Open browser
start http://localhost:3000

echo.
echo ================================================
echo  ✅ Operations Control Center Started!
echo ================================================
echo.
echo 📊 Services:
echo   Frontend:   http://localhost:3000
echo   API:        http://localhost:9000/api
echo   Database:   PostgreSQL (Docker:5440)
echo   Mailhog:    http://localhost:8025
echo.
echo 🔐 Login:
echo   Email:    admin@test.local
echo   Password: password
echo.
echo ================================================
echo.

