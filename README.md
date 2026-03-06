# Operations Control Center

**Operations Control Center (OCC)** is a **multi-tenant full-stack demo application** designed for managing operational workflows across incidents, assets, contracts, workforce planning, reporting, notifications, and a lightweight HR area.

What makes this repository worth a closer look is that it goes well beyond the usual single-feature tech demo. It is still a demo — and we do not want to oversell it — but it is also a **broader, tenant-aware, role-aware application** with a real backend/frontend split, granular permissions, background processing, optional realtime updates, and a testing setup that reflects a more realistic system shape.

In other words: **this is a showcase of a larger multi-tenant operations platform design**, not just another isolated CRUD sample with a polished UI.

---

## Highlights

- **Laravel 12 backend** for API, domain logic, queues, authorization, and data management
- **Next.js 16 frontend** with React 19 and TypeScript
- **Multi-tenant architecture** with tenant-scoped operational data
- **Granular RBAC model** with roles and permissions
- **Simple HR module** covering employees, shifts, workload, and time-off approval flows
- **Practical UI approach** focused on readability, contrast, and efficient everyday use
- **Operational domain coverage** across:
    - incidents
    - contracts
    - assets and maintenance
    - employees and shifts
    - time-off and workload
    - reports
    - notifications
    - settings and audit-related access
- **Queue-based background processing**
- **Optional realtime layer** via Laravel Reverb / WebSockets
- **Automated testing** on both frontend and backend
- **Monorepo structure** with clearly separated backend and frontend applications

---

## Scope of the demo

OCC is designed as a **multi-tenant operations management demo**. Instead of focusing on one narrow feature, it models how several connected business domains work together in a shared, tenant-aware system:

- **Incident management**
    - reporting, updating, escalating, closing, and commenting
- **Asset operations**
    - asset visibility, maintenance logging, and maintenance scheduling
- **Contract workflows**
    - contract lifecycle handling, approvals, and status changes
- **Workforce / HR operations**
    - employee records, shift coordination, workload visibility, and time-off approval
- **Reporting**
    - read/export/create flows depending on access level
- **Notifications**
    - viewing notifications and managing notification schedules
- **Administration**
    - user management, role assignment, settings, and selected system-level capabilities

The HR area is intentionally lightweight, but important to the overall system design. It adds a people-operations layer to the platform, making it possible to work not only with contracts, incidents, and assets, but also with the workforce behind them. In practice, that means the demo includes support for **employee visibility, shift management, workload planning, and time-off approval workflows**, all governed by role-based permissions.

---

## HR module

Besides operational workflows around contracts, incidents, and assets, OCC also includes a **simple HR module**.

Its purpose is not to act as a full HRIS, but to show how workforce-related data can participate in a broader operations platform. The module covers:

- **employee directory / employee visibility**
- **shift management**
- **workload management**
- **time-off approval workflows**

This helps demonstrate a more realistic cross-functional setup: operational planning is connected not only to work items and assets, but also to the people responsible for handling them.

---

## UI and design approach

The visual design of OCC is intentionally aligned with what the application is meant to be: **a practical work tool for everyday use**.

Rather than aiming for a consumer-style interface full of decorative patterns, oversized typography, soft-contrast palettes, or presentation-first effects, the UI is designed to favor:

- **clarity**
- **readability**
- **strong contrast**
- **direct navigation**
- **low-friction daily use**

The goal is simple: if a user spends hours a day in the system, the interface should stay easy to scan, predictable to operate, and visually straightforward. In that sense, the design intentionally prioritizes **function, legibility, and operational efficiency over novelty**.

---

## Tech stack

### Backend
- **PHP 8.2+**
- **Laravel 12**
- Laravel Sanctum
- Laravel Reverb
- PostgreSQL
- Redis
- Pest / PHPUnit
- PHPStan / Larastan

### Frontend
- **Next.js 16**
- **React 19**
- **TypeScript 5**
- Tailwind CSS 4
- Vitest
- Cypress

---

## Architecture overview

This repository is a **monorepo** containing:

- a **Laravel backend** in the project root
- a **Next.js frontend** in the `frontend/` directory

The typical development setup includes:

1. **Backend API**
2. **Frontend app**
3. **Queue worker**
4. optional **Reverb WebSocket server**
5. PostgreSQL and Redis, typically via Docker

---

## Project structure

```text
.
├── app/                  # Laravel application code
├── bootstrap/
├── config/
├── database/             # migrations, factories, seeders
├── docker/
├── docs/                 # extended project documentation
├── frontend/             # Next.js frontend application
│   ├── app/              # App Router pages
│   ├── components/       # UI components
│   ├── hooks/            # custom React hooks
│   ├── lib/              # API helpers, auth, roles, permissions, shared types
│   ├── cypress/          # end-to-end tests
│   └── tests/            # unit/integration tests
├── public/
├── resources/
├── routes/
├── scripts/
├── storage/
└── tests/                # backend tests
```

---

## Access control model

One of the stronger parts of this demo is its **role and permission structure**.

The application uses **role-based access control (RBAC)** with **resource/action permissions**, allowing the UI and backend to distinguish between:

- who can **see** a module
- who can **create** records
- who can **edit** records
- who can **delete** records
- who can perform **special actions** such as approval, escalation, closing, scheduling, or role assignment

Authorization is not only role-based, but also relevant to **tenant scope**, so access can differ not just by role, but also by which tenant context the user operates in.

### Core roles

- **Superadmin**
    - full system-wide access
    - includes system-level capabilities
- **Admin**
    - broad tenant-wide access
    - excludes the highest system-management capabilities
- **Manager**
    - operational and managerial permissions across key business areas
- **Technician**
    - focused operational access for field/service workflows
- **Viewer**
    - basic read-only access

### Specialized viewer roles

- **Viewer – Management**
    - strategic read-only access across a wider set of business areas
- **Viewer – Auditor**
    - compliance-oriented read access, including audit-related visibility
- **Viewer – Client**
    - limited read-only access to own or assigned resources only

### Permission style

Permissions are modeled in a granular format such as:

- `contracts.view`
- `contracts.create`
- `contracts.edit`
- `contracts.delete`
- `contracts.approve`
- `incidents.escalate`
- `incidents.close`
- `assets.log_maintenance`
- `settings.manage_roles`
- `system.view_audit_logs`

This enables both:

- **module visibility control** in the frontend
- **server-side enforcement** in the backend

For a fuller breakdown, see [docs/access-control.md](docs/access-control.md).

---

## Running the project

For complete setup and day-to-day development instructions, see:

- [docs/setup.md](docs/setup.md)
- [docs/frontend.md](docs/frontend.md)

### Quick start summary

```bash
composer install
cp .env.example .env
php artisan key:generate

docker compose up -d

php artisan migrate:fresh --seed

cd frontend
cp .env.local.example .env.local
npm install
cd ..
```

Then run the required services:

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
| PostgreSQL | 127.0.0.1:5440 |
| Redis | 127.0.0.1:6379 |

---

## Development notes

- Docker is used primarily for **PostgreSQL** and **Redis**
- Realtime support is **optional** during local development
- The frontend expects the backend API to be available locally
- Some frontend E2E scenarios can run with mocked API calls, which is useful for UI smoke testing
- The project is best understood as a **broad technical demo / showcase**, not a polished SaaS product

---

## Testing

### Backend

```bash
php artisan test
```

### Frontend unit/integration tests

```bash
cd frontend
npm run test
```

### Frontend E2E tests

```bash
cd frontend
npm run test:e2e
```

Interactive Cypress mode:

```bash
cd frontend
npm run test:e2e:open
```

---

## Why this project stands out as a demo

A lot of technical demos are intentionally narrow:

- one page
- one flow
- one entity
- one hardcoded role
- one happy path

OCC takes a different route.

It demonstrates how a larger internal operations platform can be structured when you need:

- multiple business domains
- tenant-aware data separation
- permission-aware UI states
- differentiated user roles
- backend enforcement
- queues and optional realtime communication
- a frontend/backend split that resembles a real application setup
- an interface designed for daily operational use rather than presentation value

That does **not** make it a finished enterprise product — and it is not presented as one. But it does make it a **substantially richer and more realistic demo** than the average repository of this type.

---

## Documentation

Additional documentation lives in [`docs/`](docs/):

- [docs/setup.md](docs/setup.md) – full installation and local development setup
- [docs/frontend.md](docs/frontend.md) – frontend-specific setup, scripts, and environment variables
- [docs/access-control.md](docs/access-control.md) – roles, permissions, and authorization model

---

## License

This repository is provided **as is**, without warranty of any kind, express or implied.

You are welcome to study, reuse, adapt, and build upon the code and ideas in this repository, including for your own projects. If you do so, please provide **clear attribution to the original author** and reference this repository as the source of inspiration or reused material.

In short:

- **use is allowed**
- **modification is allowed**
- **reuse is allowed**
- **attribution is expected**
- **no warranty or liability is provided**

If you want this intention to be legally explicit, add a dedicated `LICENSE` file with a matching attribution-based license text.
```