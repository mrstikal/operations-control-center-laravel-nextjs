@echo off
REM OCC Complete Development Environment Setup for Windows

echo 🚀 Operations Control Center - Full Development Setup
echo ======================================================
echo.

REM Step 1: Docker
echo [Step 1] Starting Docker Services...
docker-compose up -d
if errorlevel 1 (
    echo ⚠️ Docker not available - skipping
) else (
    echo ✅ Docker services started
    timeout /t 5 /nobreak
)

REM Step 2: Backend Setup
echo [Step 2] Setting up Backend...
call composer install
php artisan key:generate 2>nul
echo ✅ Backend dependencies installed
echo.

REM Step 3: Database
echo [Step 3] Setting up Database...
php artisan migrate --quiet 2>nul || (
    echo ⚠️ Migration encountered issue (check DB connection)
)
php artisan db:seed --class=RoleAndPermissionSeeder --quiet 2>nul || (
    echo ⚠️ Seeding encountered issue
)
echo ✅ Database ready
echo.

REM Step 4: Frontend
echo [Step 4] Setting up Frontend...
cd frontend
call npm install
call npm run build
cd ..
echo ✅ Frontend ready
echo.

REM Step 5: Ready
echo ======================================================
echo ✅ Setup Complete!
echo ======================================================
echo.
echo 🔗 Services:
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:3000
echo    Database: localhost:5440 (occ_user)
echo    Redis:    localhost:6379
echo    Mailhog:  http://localhost:8025
echo.
echo 📝 Quick Start:
echo    Terminal 1: php artisan serve
echo    Terminal 2: npm --prefix frontend run dev
echo    Terminal 3: php artisan queue:listen
echo.
echo 🔐 Test Login:
echo    Email:    admin@test.local
echo    Password: password
echo.

