# 🚀 Operations Control Center - Setup Guide

## ✅ Prerequisites

- [x] PHP 8.2+
- [x] Node.js 18+
- [x] Composer
- [x] Docker + Docker Compose (RECOMMENDED)
- [x] PostgreSQL 16 (v Docker nebo lokálně)

---

## 🐳 **OPTION 1: Docker Setup (RECOMMENDED)**

### Step 1: Start Docker Services

```bash
cd F:\laravel\operations-control-center
docker-compose up -d
```

Verify all services running:
```bash
docker-compose ps
```

Expected output:
```
NAME           STATUS
occ-postgres   Up (healthy)
occ-redis      Up (healthy)
occ-mailhog    Up
```

### Step 2: Database Migrations

```bash
php artisan migrate --force
```

### Step 3: Seed Data

```bash
php artisan db:seed
```

Creates:
- Test tenant
- 5 roles (Admin, Manager, Technician, Operator, Viewer)
- 30+ permissions
- Test user (admin@test.local / password)

### Step 4: Start Backend

```bash
php -S 127.0.0.1:8000 -t public
```

Backend: **http://127.0.0.1:8000**

### Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend: **http://localhost:3000**

### Step 6: Login

```
Email:    admin@test.local
Password: password
```

---

## 💻 **OPTION 2: Local PostgreSQL Setup**

Pokud nechceš Docker:

### Step 1: Install PostgreSQL

1. Download: https://www.postgresql.org/download/windows/
2. Version 16+ recommended
3. Install with default settings
4. Note the password for `postgres` user

### Step 2: Create Database

```bash
psql -U postgres -c "CREATE USER occ_user WITH PASSWORD 'occ_secure_password_123';"
psql -U postgres -c "CREATE DATABASE operations_control_center OWNER occ_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE operations_control_center TO occ_user;"
```

### Step 3: Update .env

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=operations_control_center
DB_USERNAME=occ_user
DB_PASSWORD=occ_secure_password_123
```

### Step 4: Migrations & Seed

```bash
php artisan migrate
php artisan db:seed
```

### Step 5: Start Servers

```bash
# Terminal 1: Backend
php -S 127.0.0.1:8000 -t public

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 📋 **Verification Checklist**

- [ ] Docker running (`docker-compose ps`)
- [ ] PostgreSQL accessible (127.0.0.1:5440 or 5432)
- [ ] All migrations ran (`php artisan migrate:status`)
- [ ] Seeds executed (`php artisan tinker` → User::count())
- [ ] Backend running (http://127.0.0.1:8000)
- [ ] Frontend running (http://localhost:3000)
- [ ] Login works (admin@test.local / password)
- [ ] Dashboard loads
- [ ] API responds (GET /api/contracts)

---

## 🔍 **Debugging**

### Test Database Connection

```bash
php artisan tinker
>>> DB::connection()->getPDO()
>>> \App\Models\User::count()
```

### Check Docker Logs

```bash
docker-compose logs postgres
docker-compose logs redis
```

### Connect to PostgreSQL

```bash
docker exec -it occ-postgres psql -U occ_user -d operations_control_center
```

### Reset Everything

```bash
# Clean restart
docker-compose down -v
docker-compose up -d
php artisan migrate --fresh
php artisan db:seed
```

---

## 📊 **Service Details**

### PostgreSQL (Docker)
```
Host:     127.0.0.1
Port:     5440
Database: operations_control_center
User:     occ_user
Password: occ_secure_password_123
```

### Redis (Docker)
```
Host: 127.0.0.1
Port: 6379
```

### Mailhog (Docker)
```
Web UI: http://localhost:8025
SMTP:   127.0.0.1:1025
```

### Laravel Backend
```
URL: http://127.0.0.1:8000
PHP Server on port 8000
```

### Next.js Frontend
```
URL: http://localhost:3000
Dev server
```

---

## 🎯 **What's Next**

1. ✅ Explore dashboard: http://localhost:3000
2. ✅ Test API endpoints: http://127.0.0.1:8000/api/*
3. ✅ Run tests: `php artisan test`
4. ✅ Read documentation (see README.md)
5. ✅ Start developing!

---

## ⚡ **Quick Commands**

```bash
# Migrations
php artisan migrate
php artisan migrate:reset
php artisan migrate:refresh

# Database
php artisan db:seed
php artisan tinker

# Testing
php artisan test
php artisan test --coverage

# Docker
docker-compose up -d
docker-compose down
docker-compose ps
docker-compose logs -f postgres

# Frontend
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint

# Server
php -S 127.0.0.1:8000 -t public
```

---

## 🆘 **Troubleshooting**

See **DOCKER_TROUBLESHOOTING.md** for detailed debugging guide.

---

**Setup Complete!** 🎉

You can now develop and test Operations Control Center.

