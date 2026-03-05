@echo off
REM Stop all Docker containers

echo 🛑 Stopping OCC Docker environment...
docker-compose down

echo ✅ Docker environment stopped!
echo.
echo 💾 To remove volumes and data:
echo    docker-compose down -v

