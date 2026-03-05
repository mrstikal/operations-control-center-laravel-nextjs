# 🐳 Docker Setup Troubleshooting

## ❌ Problem
```
Connection refused on port 5440
PostgreSQL container not running
```

## ✅ Solution 1: Spustit Docker Desktop (DOPORUČENO)

### Windows
1. Otevři **Start Menu**
2. Hledej **Docker Desktop**
3. Klikni na něj
4. Počkej 30-60 sekund na inicializaci
5. Potom spusť:

```bash
docker-compose up -d
```

### Kontrola
```bash
docker ps
docker-compose ps
```

Ověř, že všechny 3 kontejnery běží:
```
occ-postgres   ✅ Up (healthy)
occ-redis      ✅ Up (healthy)
occ-mailhog    ✅ Up
```

---

## ✅ Solution 2: PostgreSQL lokálně (bez Dockeru)

Pokud Docker Desktop není dostupný:

### Windows - Nainstaluj PostgreSQL

1. Stáhni: https://www.postgresql.org/download/windows/
2. Verze 16+ doporučena
3. Instaluj s výchozími nastavením
4. Port: 5432 (default)

### Setup PostgreSQL

```powershell
# Připoj se k PostgreSQL
psql -U postgres

# V psql:
CREATE USER occ_user WITH PASSWORD 'occ_secure_password_123';
CREATE DATABASE operations_control_center OWNER occ_user;
GRANT ALL PRIVILEGES ON DATABASE operations_control_center TO occ_user;
\q
```

### Aktualizuj .env

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=operations_control_center
DB_USERNAME=occ_user
DB_PASSWORD=occ_secure_password_123
```

### Spusť migraci

```bash
php artisan migrate
php artisan db:seed --class=RoleAndPermissionSeeder
```

---

## 🔍 **Debugging Commands**

### Test database connection
```bash
php artisan migrate:status

# Nebo přímý test
php artisan tinker
>>> DB::connection()->getPDO()
>>> // Vrátí info o připojení
```

### Check Docker logs
```bash
docker-compose logs postgres
docker-compose logs redis
docker-compose logs mailhog
```

### Connect to PostgreSQL v Docker
```bash
docker exec -it occ-postgres psql -U occ_user -d operations_control_center

# V psql:
\dt              # List all tables
SELECT COUNT(*) FROM users;
\q              # Exit
```

### Restart services
```bash
docker-compose restart postgres
docker-compose restart redis
docker-compose restart mailhog
```

---

## 📊 **PostgreSQL Connection Details**

### Docker (AKTUÁLNÍ)
```
Host:     127.0.0.1
Port:     5440
Database: operations_control_center
User:     occ_user
Password: occ_secure_password_123
```

### Local (Alternative)
```
Host:     127.0.0.1
Port:     5432
Database: operations_control_center
User:     occ_user
Password: occ_secure_password_123
```

---

## 🛑 **Port Already in Use**

Pokud port 5440 je obsazený:

### Změň docker-compose.yml
```yaml
postgres:
  ports:
    - "5441:5432"  # Použij 5441 místo 5440
```

### Aktualizuj .env
```env
DB_PORT=5441
```

### Restart
```bash
docker-compose down
docker-compose up -d
```

---

## ✅ **Ověřovací Checklist**

- [ ] Docker Desktop běží
- [ ] `docker-compose ps` ukazuje 3 healthy kontejnery
- [ ] PostgreSQL je accessible na 127.0.0.1:5440
- [ ] `php artisan migrate:status` zobrazuje všechny migraci
- [ ] `php artisan db:seed` proběhl bez erroru
- [ ] `php artisan tinker` se connects k DB
- [ ] Backend běží na http://127.0.0.1:8000
- [ ] Frontend běží na http://localhost:3000
- [ ] Login works s admin@test.local / password

---

## 🎯 **AKTUÁLNÍ SETUP**

Projekt je nyní nakonfigurovaný **VÝHRADNĚ NA POSTGRESQL** v Docker:

```bash
# Spustit všechno:
docker-compose up -d          # Start PostgreSQL, Redis, Mailhog
php -S 127.0.0.1:8000 -t public  # Start Laravel backend
npm --prefix frontend run dev  # Start Next.js frontend

# Migrations
php artisan migrate
php artisan db:seed

# Test
http://localhost:3000
admin@test.local / password
```

PostgreSQL je **MANDATORY** pro tento projekt!


