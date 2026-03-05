# 🚀 Operations Control Center - Herd Setup Guide

## ✅ Setup s Laravel Herd

Pokud máš Laravel Herd nainstalovaný:

### 1️⃣ Nakonfiguruj projekt v Herd

```bash
# Project se automaticky registruje v Herd
# Herd detekuje Laravel a vytvoří:
# - Domain: operations-control-center.test
# - PHP: 8.4 (default)
# - Database: Herd PostgreSQL
```

### 2️⃣ Ověř .env nastavení

```env
APP_URL=http://operations-control-center.test
DB_HOST=127.0.0.1
DB_PORT=5440
DB_DATABASE=operations_control_center
```

### 3️⃣ Spustit Backend

Herd automaticky spouští backend, ale ověř:

```bash
# Herd Web UI - zkontroluj status
# aplikace by měla běžet

# Nebo příkazem:
php artisan serve
```

### 4️⃣ Spustit Frontend

```bash
cd frontend
npm run dev
```

Frontend běží na: **http://localhost:3000**

### 5️⃣ Otevřít Aplikaci

```
http://operations-control-center.test/
```

Automaticky se přesměruje na frontend login:

```
Login:
Email:    admin@test.local
Password: password
```

---

## 🔄 How It Works

```
Herd (http://operations-control-center.test/)
    ↓
    Routes to web.php (redirect route)
    ↓
    Redirects to Frontend (http://localhost:3000)
    ↓
    Frontend calls API
    ↓
    API (http://operations-control-center.test/api)
    ↓
    PostgreSQL (Docker port 5440)
```

---

## 🐳 PostgreSQL Setup

### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

Postgres běží na:
- Host: 127.0.0.1
- Port: 5440
- User: occ_user
- Password: occ_secure_password_123

### Option 2: Herd PostgreSQL

Herd má vestavený PostgreSQL:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
# Zkonfiguruj dle svého setupu
```

---

## 🔗 Endpoints

| Service | URL | Note |
|---------|-----|------|
| **Frontend** | http://localhost:3000 | Next.js dev |
| **Backend (Herd)** | http://operations-control-center.test | PHP server |
| **API** | http://operations-control-center.test/api | REST API |
| **Database** | 127.0.0.1:5440 | PostgreSQL (Docker) |

---

## ⚡ Quick Commands

```bash
# Database
php artisan migrate
php artisan db:seed

# Testing
php artisan test

# Frontend
npm --prefix frontend run dev
npm --prefix frontend run build

# Docker
docker-compose up -d
docker-compose ps
```

---

## 🛠️ Troubleshooting

### Frontend nije vidljiv

1. Provjeri da Next.js server běží:
```bash
cd frontend && npm run dev
```

2. Provjeri port 3000:
```bash
netstat -ano | findstr :3000
```

### API nije dostupan

1. Provjeri API route:
```bash
php artisan route:list | grep api
```

2. Provjeri PostgreSQL:
```bash
docker-compose ps
```

### Database Migrate Fails

```bash
# Ověr Postgres connection
php artisan tinker
>>> DB::connection()->getPDO()
```

---

## 📊 Project Structure with Herd

```
operations-control-center/        (Herd Project Root)
├── app/                          (Laravel App)
├── routes/                       (API + Web routes)
│   ├── api.php                  (REST API)
│   └── web.php                  (SPA redirect)
├── database/                     (Migrations)
├── frontend/                     (Next.js)
│   ├── app/                     (Pages)
│   ├── lib/                     (API client)
│   └── .env.local               (Frontend config)
├── public/                       (Laravel public)
├── .env                         (Laravel config)
└── docker-compose.yml           (PostgreSQL)
```

---

## ✅ Verification Checklist

- [ ] Herd projekt běží (operations-control-center.test)
- [ ] Docker PostgreSQL běží (docker-compose ps)
- [ ] Database migrace úspěšné (php artisan migrate:status)
- [ ] Next.js frontend běží (localhost:3000)
- [ ] Frontend přesměruje správně
- [ ] Login funguje (admin@test.local / password)
- [ ] API dostupný (GET /api/contracts)

---

## 🎯 Next Steps

1. ✅ Otevři http://operations-control-center.test/
2. ✅ Prihlas se (admin@test.local / password)
3. ✅ Prohlédni dashboard
4. ✅ Test API endpoints
5. ✅ Začni vyvíjet!

---

**Hotovo! Aplikace běží na Herd.** 🎉

Máš:
- ✅ Backend na Herd (operations-control-center.test)
- ✅ Frontend Next.js (localhost:3000)
- ✅ PostgreSQL v Docker
- ✅ SPA redirect flow

Vývoj můžeš začít! 🚀

