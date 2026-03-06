# Frontend guide

This document covers frontend-specific setup and scripts for the Next.js application in `frontend/`.

## Overview

The frontend is built with:

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Vitest** for unit/integration testing
- **Cypress** for end-to-end testing

It communicates with the Laravel backend API and can optionally connect to realtime updates.

---

## Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
```

---

## Development

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

> The frontend expects the Laravel backend API to be running locally.

---

## Production build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

## Environment variables

Start from:

```bash
cp .env.local.example .env.local
```

Typical values:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api

NEXT_PUBLIC_REVERB_APP_KEY=<local-app-key>
NEXT_PUBLIC_REVERB_HOST=127.0.0.1
NEXT_PUBLIC_REVERB_PORT=8081
NEXT_PUBLIC_REVERB_SCHEME=http
```

Adjust these values to match your local environment.

---

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run format:check
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:open
```

---

## Testing

### Unit and integration tests

Run once:

```bash
npm run test
```

Run in watch mode:

```bash
npm run test:watch
```

### Coverage

If coverage is configured in your local workflow, run:

```bash
npm run test:coverage
```

### E2E tests

Run Cypress in headless mode:

```bash
npm run test:e2e
```

Run Cypress in interactive mode:

```bash
npm run test:e2e:open
```

Some E2E coverage uses API interception/mocking, which is useful for smoke testing UI flows even when backend scenarios are not fully wired.

---

## UI philosophy

The frontend is intentionally designed as a **working interface first**.

This means the UI favors:

- **clear information hierarchy**
- **stronger readability**
- **direct interactions**
- **practical contrast**
- **day-to-day usability**

The goal is not to imitate a public-facing consumer app, but to reflect the needs of an operational tool that may be used continuously throughout the workday.

---

## Integration expectations

The frontend typically expects:

- the Laravel backend API to be reachable
- local auth and API configuration to be aligned
- optional realtime configuration if live updates are needed

If the frontend appears to load correctly but data is missing, the first things to verify are:

- `NEXT_PUBLIC_API_URL`
- backend availability
- local authentication/session setup
- any tenant-related context required by your test scenario

---

## Related documentation

- [setup.md](setup.md) – full local setup
- [access-control.md](access-control.md) – roles and permission model
```