# Setup and local development

This document describes how to run the full **Operations Control Center** stack locally.

## Requirements

| Tool | Version |
|------|---------|
| PHP | 8.2+ |
| Composer | 2+ |
| Node.js | 20+ |
| npm | 10+ |
| Docker + Docker Compose | any recent version |

> Docker is used to provide PostgreSQL and Redis locally. If you do not use Docker, you need equivalent services running on your machine.

---

## First-time setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd operations-control-center
```

### 2. Create and configure the backend environment file

```bash
cp .env.example .env
```

Open `.env` and adjust the local configuration as needed, especially:

- database connection settings
- Redis connection settings
- mail configuration if relevant to your local setup
- any other environment-specific values required by your environment

If you are using the provided Docker setup, make sure the values match `docker-compose.yml`.

### 3. Install backend dependencies

```bash
composer install
php artisan key:generate
```

---

### 4. Start infrastructure services

```bash
docker compose up -d
```

Give PostgreSQL a few seconds to finish booting, then run:

```bash
php artisan migrate:fresh --seed
```

---

### 5. Install frontend dependencies

```bash
cd frontend
cp .env.local.example .env.local
npm install
cd ..
```

---

## Running the application

You will typically use **3 terminals**.

### Terminal 1 – Laravel backend

```bash
php artisan serve --host=127.0.0.1 --port=8080 --tries=1 --no-reload
```

### Terminal 2 – Next.js frontend

```bash
cd frontend
npm run dev
```

### Terminal 3 – Queue worker

```bash
php artisan queue:listen
```

### Optional Terminal 4 – Reverb WebSocket server

```bash
php artisan reverb:start --host=127.0.0.1 --port=8081
```

---

## Local URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8080/api |
| Mailhog | http://127.0.0.1:8025 |

Typical local service ports:

| Service | Host / Port |
|---------|--------------|
| PostgreSQL | 127.0.0.1:5440 |
| Redis | 127.0.0.1:6379 |

---

## Seeded access

After running `php artisan migrate:fresh --seed`, the project includes sample roles and test users for local development and demonstration purposes.

Use the seeded accounts defined by your local seed data.

> These accounts are meant for local development only. Do not treat them as production credentials, and do not reuse them outside your local environment.

---

## Development workflow summary

A typical local workflow looks like this:

1. start PostgreSQL and Redis via Docker
2. run the Laravel backend
3. run the Next.js frontend
4. start the queue worker
5. optionally start Reverb if you want realtime features enabled

---

## Running tests

### Backend tests

```bash
php artisan test
```

### Frontend tests

```bash
cd frontend
npm run test
```

### End-to-end tests

These require the frontend dev server to be available.

```bash
cd frontend
npm run test:e2e
```

Interactive mode:

```bash
cd frontend
npm run test:e2e:open
```

---

## Troubleshooting

### Laravel server does not start or the port is occupied

Run it explicitly on the expected port:

```bash
php artisan serve --host=127.0.0.1 --port=8080 --tries=1 --no-reload
```

### Frontend shows CORS or API connectivity issues

Verify that:

- the backend is running on `127.0.0.1:8080`
- `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches the backend API URL

### Database connection fails

Check whether your containers are running:

```bash
docker compose ps
```

Check PostgreSQL logs:

```bash
docker compose logs db
```

### Realtime features are not working

Verify that:

- the backend is running
- the Reverb server is running if your scenario depends on realtime updates
- the frontend realtime environment variables match your local setup

---

## Notes

- Docker is mainly used for local infrastructure, especially **PostgreSQL** and **Redis**
- Realtime support is optional during local development
- The repository is best understood as a **multi-tenant technical demo / showcase**
- For frontend-specific details, see [frontend.md](frontend.md)