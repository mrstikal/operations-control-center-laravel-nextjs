# 🐳 Docker Setup pro OCC (Operations Control Center)

## Příprava

### Předpoklady
- Docker Desktop nainstalovaný a spuštěný
- Port 5440 volný (PostgreSQL)
- Port 6379 volný (Redis)
- Port 8025 volný (Mailhog)

### Spuštění Docker kontejnerů

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Služby

### PostgreSQL (Port 5440)
```
Host: 127.0.0.1
Port: 5440
Database: operations_control_center
Username: occ_user
Password: occ_secure_password_123
```

**Připojení z příkazové řádky:**
```bash
psql -h 127.0.0.1 -p 5440 -U occ_user -d operations_control_center
```

### Redis (Port 6379)
```
Host: 127.0.0.1
Port: 6379
```

**Testování:**
```bash
redis-cli -p 6379 ping
# Response: PONG
```

### Mailhog (Port 8025)
```
Web UI: http://localhost:8025
SMTP Port: 1025
```

## Laravel Setup

### 1. Migrace databáze

```bash
# Run migrations
php artisan migrate

# Seed role/permission data
php artisan db:seed --class=RoleAndPermissionSeeder

# Verify tables
php artisan tinker
>>> \App\Models\User::count()
```

### 2. Redis Setup (Optional)

Pokud chceš používat Redis pro:
- **Queue**: QUEUE_CONNECTION=redis
- **Cache**: CACHE_STORE=redis
- **Session**: SESSION_DRIVER=redis

Nastav v `.env`:
```env
QUEUE_CONNECTION=redis
CACHE_STORE=redis
BROADCAST_DRIVER=redis
```

### 3. Mail Testing

Mailhog zachytí veškerou poštu:
1. Jdi na http://localhost:8025
2. V `.env` je nastaveno: MAIL_MAILER=log

Chceš-li SMTP, změň:
```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
```

## Development Commands

```bash
# Start all services
docker-compose up -d

# Backend dev server
php artisan serve

# Frontend dev server
npm --prefix frontend run dev

# Queue worker
php artisan queue:listen

# Run tests
php artisan test
```

## Debugging

### PostgreSQL Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U occ_user -d operations_control_center -c "\dt"

# Check logs
docker-compose logs postgres
```

### Check Database

```bash
# Login to psql
docker exec -it occ-postgres psql -U occ_user -d operations_control_center

# List tables
\dt

# Exit
\q
```

## Zastavení služeb

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Port Already in Use
Změň port v `docker-compose.yml`:
```yaml
ports:
  - "5441:5432"  # Use 5441 instead of 5440
```

Pak aktualizuj `.env`:
```env
DB_PORT=5441
```

### Docker Service Not Running
```bash
# Windows - restartuj Docker Desktop
# Linux
sudo systemctl restart docker
```

### Cannot Connect to Database
```bash
# Ujisti se, že container běží
docker-compose ps

# Check healthcheck status
docker-compose exec postgres pg_isready
```

## Production Deployment

Pro produkci:
1. Změň hesla v `docker-compose.yml`
2. Nastav `APP_DEBUG=false` v `.env`
3. Use environment-specific `.env.production`
4. Proveď backup databáze
5. Nastav SSL/TLS

## Užitečné příkazy

```bash
# Tail logs
docker-compose logs -f postgres

# Execute command in container
docker-compose exec postgres psql -U occ_user -d operations_control_center -c "SELECT version();"

# Backup database
docker-compose exec postgres pg_dump -U occ_user operations_control_center > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U occ_user operations_control_center
```

