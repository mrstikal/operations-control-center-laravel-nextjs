#!/bin/bash
# OCC Docker quick start

set -e

echo "🐳 Starting OCC Docker environment..."

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Start services
echo "📦 Starting containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
docker-compose exec -T postgres pg_isready -U occ_user -d operations_control_center > /dev/null 2>&1 || true
sleep 5

echo "✅ Docker environment started!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🔗 Connection Details:"
echo "   PostgreSQL: postgresql://occ_user:occ_secure_password_123@127.0.0.1:5440/operations_control_center"
echo "   Redis: redis://127.0.0.1:6379"
echo "   Mailhog: http://localhost:8025"
echo ""
echo "📝 Next steps:"
echo "   1. php artisan migrate"
echo "   2. php artisan db:seed --class=RoleAndPermissionSeeder"
echo "   3. php artisan serve"

