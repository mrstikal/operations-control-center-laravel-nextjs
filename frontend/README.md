# OCC Frontend (Next.js)

Minimalni frontend pro `Operations Control Center`.

## Co umi
- Login proti Laravel API (`/api/login`)
- Ulozeni bearer tokenu do localStorage
- Chranena stranka `dashboard`
- Nacteni `contracts` a `incidents`
- Pripraveny WebSocket klient (`laravel-echo` + `pusher-js`)

## Setup
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run smoke
```

## Env
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=mt
```

## Poznamka
Pro real-time update dopln Pusher/Ably klice a subscribe logiku v `lib/realtime.ts` + page komponentach.

