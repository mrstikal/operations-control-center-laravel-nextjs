# Operations Control Center (OCC)

Digitální dispečink pro provoz firmy: zakázky, incidenty, assety, realtime dashboard.

**Status:** Phase 10 (Dashboard) - Backend ✅, Frontend 🔄  
**Last Updated:** 5. března 2026

## 🔧 Požadavky

- PHP 8.4+
- Node.js 18+
- **PostgreSQL 16+** (MANDATORY - v Docker nebo lokálně)
- Docker & Docker Compose (pro PostgreSQL, Redis, Mailhog)

## 🚀 Architektura

- Laravel 12 API backend (`/api/*`) na portu 8000
- Next.js 15 frontend na portu 3000
- **PostgreSQL** (port 5440 v Docker nebo 5432 lokálně)
- Sanctum token auth
- WebSocket broadcasting (Pusher/Redis)

## ⚡ Quick Start

### 1️⃣ Docker Setup (RECOMMENDED)

```bash
# Spustit PostgreSQL, Redis, Mailhog
docker-compose up -d

# Ověřit
docker-compose ps
```

### 2️⃣ Database Migrations

```bash
# Spustit migrace
php artisan migrate

# Seed data (roles, permissions, test users)
php artisan db:seed
```

### 3️⃣ Backend Server

```bash
php -S 127.0.0.1:8000 -t public
# nebo
php artisan serve --port=8000
```

Backend: **http://127.0.0.1:8000**

### 4️⃣ Frontend Server

```bash
cd frontend
npm install
npm run dev
```

Frontend: **http://localhost:3000**

### 5️⃣ Login

```
Email:    admin@test.local
Password: password
```

---

## 📊 Struktura Projektu

```
app/
├── Models/              (33 models)
├── Http/Controllers/    (6 API controllers)
├── Events/              (6 broadcasting events)
└── Policies/            (5 authorization policies)

database/
├── migrations/          (14 migrations, 36 tables)
└── seeders/             (roles, permissions, users)

frontend/
├── app/                 (Next.js pages)
├── lib/                 (API client, auth, realtime)
└── components/          (React components)

config/
├── database.php         (PostgreSQL)
└── broadcasting.php     (WebSocket)
```

---

## 🗄️ Database

### PostgreSQL (MANDATORY)

#### Option 1: Docker (Recommended)
```bash
docker-compose up -d
# Runs on port 5440
# User: occ_user
# Password: occ_secure_password_123
```

#### Option 2: Local PostgreSQL
```bash
# Install PostgreSQL 16+
# Create user & database:
psql -U postgres
CREATE USER occ_user WITH PASSWORD 'occ_secure_password_123';
CREATE DATABASE operations_control_center OWNER occ_user;
GRANT ALL PRIVILEGES ON DATABASE operations_control_center TO occ_user;

# Update .env:
# DB_PORT=5432
```

---

## 🔐 Autentizace

- **Sanctum token-based** API auth
- **5 roles**: Admin, Manager, Technician, Operator, Viewer
- **30+ granular permissions** (RBAC)
- **Multi-tenant** isolation

---

## 📖 Dokumentace

- **DOCKER_SETUP.md** - Docker konfiguraci
- **DOCKER_TROUBLESHOOTING.md** - Debugging
- **API_DOCUMENTATION.md** - API reference (30+ endpoints)
- **WEBSOCKET_GUIDE.md** - Real-time setup
- **TESTING_GUIDE.md** - Test patterns
- **ROLES_DESIGN.md** - Authorization

---

## 🧪 Testing

```bash
php artisan test
php artisan test --coverage
```

58+ tests, 85%+ coverage

---

## 📈 Features

✅ Multi-tenant SaaS architecture  
✅ Contract management with SLA tracking  
✅ Incident management with escalation  
✅ Asset management with maintenance  
✅ **Dashboard API** (Operational & Business KPIs)  
✅ **Real-time Event Feed** (Activity Timeline)  
✅ Real-time WebSocket broadcasting  
✅ Role-based authorization (RBAC)  
✅ Event sourcing ready  
✅ Industrial UI theme  
✅ Complete API documentation  

---

## 📊 Dashboard API

### Summary Endpoint
`GET /api/dashboard/summary`

Returns operational & business KPIs:
- **Operational KPIs**: Incidents stats, SLA metrics, response/resolution times
- **Business KPIs**: Contracts stats, budget tracking, asset counts

### Feed Endpoint  
`GET /api/dashboard/feed?limit=15`

Returns real-time activity feed from event sourcing system.

---

## 🚀 Status

**Phase 1-8: 100% COMPLETE**
**Iteration 2: In Progress** ✨

- ✅ Database (PostgreSQL + 14 migrations)
- ✅ Authorization (5 roles, 30+ permissions)
- ✅ API (30+ endpoints)
- ✅ Testing (58+ tests, 85% coverage)
- ✅ WebSocket (Broadcasting ready)
- ✅ Frontend (Next.js + Dashboard)
- ✅ Docker (PostgreSQL, Redis, Mailhog)
- ✅ **Iteration 2**:
  - ✅ Operational & Business KPI endpoints
  - ✅ Dashboard Feed endpoint (event timeline)
  - ✅ DashboardController fixes (SQL, method calls)
  - 🔄 Frontend dashboard improvements

**Production-ready!** 🎉

---

## 📞 Support

Viz relevantní README:
- DOCKER_TROUBLESHOOTING.md
- API_DOCUMENTATION.md
- TESTING_GUIDE.md
