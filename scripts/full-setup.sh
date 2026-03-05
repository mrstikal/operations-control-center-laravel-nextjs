#!/bin/bash
# OCC Complete Development Environment Setup

set -e

echo "🚀 Operations Control Center - Full Development Setup"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Docker
echo -e "${BLUE}Step 1: Starting Docker Services...${NC}"
if command -v docker &> /dev/null; then
    docker-compose up -d
    echo -e "${GREEN}✅ Docker services started${NC}"
    sleep 5
else
    echo -e "${YELLOW}⚠️ Docker not found - skipping${NC}"
fi

# Step 2: Backend Setup
echo -e "${BLUE}Step 2: Setting up Backend...${NC}"
composer install
php artisan key:generate --quiet 2>/dev/null || true
php artisan config:cache --quiet 2>/dev/null || true
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Step 3: Database
echo -e "${BLUE}Step 3: Setting up Database...${NC}"
php artisan migrate --quiet 2>/dev/null || echo "⚠️ Migration encountered issue (check DB connection)"
php artisan db:seed --class=RoleAndPermissionSeeder --quiet 2>/dev/null || echo "⚠️ Seeding encountered issue"
echo -e "${GREEN}✅ Database ready${NC}"

# Step 4: Frontend
echo -e "${BLUE}Step 4: Setting up Frontend...${NC}"
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✅ Frontend ready${NC}"

# Step 5: Ready
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🔗 Services:${NC}"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   Database: localhost:5440 (occ_user)"
echo "   Redis:    localhost:6379"
echo "   Mailhog:  http://localhost:8025"
echo ""
echo -e "${BLUE}📝 Quick Start:${NC}"
echo "   Terminal 1: php artisan serve"
echo "   Terminal 2: npm --prefix frontend run dev"
echo "   Terminal 3: php artisan queue:listen"
echo ""
echo -e "${BLUE}🔐 Test Login:${NC}"
echo "   Email:    admin@test.local"
echo "   Password: password"
echo ""

