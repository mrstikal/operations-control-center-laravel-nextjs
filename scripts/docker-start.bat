@echo off
REM OCC Docker quick start for Windows

echo 🐳 Starting OCC Docker environment...

REM Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not running
    exit /b 1
)

REM Start services
echo 📦 Starting containers...
docker-compose up -d

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak

echo ✅ Docker environment started!
echo.
echo 📊 Service Status:
docker-compose ps
echo.
echo 🔗 Connection Details:
echo    PostgreSQL: postgresql://occ_user:occ_secure_password_123@127.0.0.1:5440/operations_control_center
echo    Redis: redis://127.0.0.1:6379
echo    Mailhog: http://localhost:8025
echo.
echo 📝 Next steps:
echo    1. php artisan migrate
echo    2. php artisan db:seed --class=RoleAndPermissionSeeder
echo    3. php artisan serve

