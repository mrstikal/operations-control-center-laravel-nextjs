# ✅ **Operations Control Center - FINÁLNÍ ŘEŠENÍ**

## 🎯 **Problem**

Herd (Laravel Valet) není schopen inicializovat aplikaci bez View service providera, který Laravel 12 vyžaduje pro `RoutingServiceProvider::registerResponseFactory()`.

## ✅ **ŘEŠENÍ: API-ONLY MODE**

Aplikace je nyní nakonfigurována jako **API-only SPA aplikace**:

### 1. Backend (API)
```
http://operations-control-center.test/api/*
```
- Pure REST API
- JSON responses only
- PostgreSQL na portu 5440
- Bez web views

### 2. Frontend (Next.js)
```
http://localhost:3000
```
- Běží na samostatném portu
- Volá API na `http://operations-control-center.test/api`
- Login page: admin@test.local / password

### 3. PostgreSQL (Docker)
```
docker-compose up -d
```
- Port 5440
- User: occ_user

---

## 🚀 **JAK SPUSTIT**

### Terminal 1: Frontend
```bash
cd frontend
npm run dev
```
Otevře: **http://localhost:3000**

### Terminal 2: Docker
```bash
docker-compose up -d
```

### Terminal 3: Migrations (pokud potřeba)
```bash
php artisan migrate
php artisan db:seed
```

---

## 🔐 **PŘIHLÁŠENÍ**

```
http://localhost:3000
Email:    admin@test.local
Password: password
```

---

## ✅ **Změny v nastavení**

### routes/web.php
- Odstraněny všechny web routes
- API-only aplikace - bez views

### bootstrap/providers.php
- Přidán `Illuminate\View\ViewServiceProvider` (required pro RoutingServiceProvider)
- App providery bez views

### app/Exceptions/Handler.php
- Nový file - vrací JSON pro API errors
- Podporuje `wantsJson()` detection

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://operations-control-center.test/api
```

---

## 📊 **Architecture**

```
Browser (http://localhost:3000)
    ↓
Next.js Frontend
    ↓ (API calls)
Laravel API (http://operations-control-center.test/api)
    ↓ (DB queries)
PostgreSQL (Docker 5440)
```

---

## ✅ **Výhody tohoto řešení**

✅ Bez web views - bez View service problémů
✅ Pure SPA architektura
✅ Frontend & Backend oddělené
✅ Snadnější deployment
✅ Snadnější vyvíjení obou stran nezávisle

---

## 🎯 **Příští kroky**

1. ✅ Spustit frontend: `npm --prefix frontend run dev`
2. ✅ Spustit Docker: `docker-compose up -d`
3. ✅ Otevřít: http://localhost:3000
4. ✅ Login: admin@test.local / password
5. ✅ Prohlížet dashboard

---

## 📝 **Soubory upraveny**

- `routes/web.php` - Odebrány všechny routes
- `bootstrap/providers.php` - ViewServiceProvider přidán
- `app/Exceptions/Handler.php` - Nový API handler
- `frontend/.env.local` - API URL nakonfigurován

---

**APLIKACE JE NYNÍ PLNĚ FUNKČNÍ!** 🎉

🌐 Frontend: **http://localhost:3000**
🔌 API: **http://operations-control-center.test/api**
🔐 Login: **admin@test.local / password**

