# JP Badminton Tournament — Shared Backend Edition

This version keeps the existing tournament website and adds a PostgreSQL-backed shared tournament state. Registrations, brackets, league stages, schedules, court scores, announcements, audit entries, and settings can now be shared across devices.

> Authentication is intentionally still the existing frontend version. Secure password and role enforcement will be added in the next phase.

## 1. Requirements

- Node.js 20+
- PostgreSQL 15+

## 2. Install

From the project root:

```bash
npm install
npm --prefix backend install
```

## 3. Configure PostgreSQL

Create a database named `jp_badminton`, then copy the environment template:

```bash
cd backend
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and set your real PostgreSQL connection string:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/jp_badminton?schema=public"
PORT=4000
FRONTEND_ORIGIN="http://localhost:5173"
```

Create the database table:

```bash
npm run db:init
```

Return to the project root:

```bash
cd ..
```

## 4. Run frontend and backend

```bash
npm run dev:all
```

Open:

- Website: http://localhost:5173
- Backend health check: http://localhost:4000/api/health

The first browser that connects uploads its current local tournament data when the database is empty. After that, the database becomes the shared source of truth. Open another browser/device and it will load the same data. Updates are saved automatically and checked every 2.5 seconds.

## 5. Production build

```bash
npm run build:all
```

Frontend output: `dist/`

Backend output: `backend/dist/`

## Cloud deployment notes

- Use any PostgreSQL provider such as Supabase, Neon, Railway, or Render.
- Deploy the backend with `backend` as the working directory.
- Backend build command: `npm install && npm run build`
- Backend start command: `npm start`
- Set `DATABASE_URL`, `PORT`, and `FRONTEND_ORIGIN` in the backend host.
- For separate frontend/backend domains, configure the frontend host to proxy `/api` to the backend, or set up a production API base URL in the next deployment phase.

## Current scope

Included now:

- PostgreSQL storage
- Express API
- Shared state across devices
- Local browser fallback when backend is temporarily unavailable
- Automatic synchronization
- PostgreSQL schema initialization and environment templates

Next phase:

- Password hashing
- Secure login API
- HTTP-only session/JWT handling
- Backend role checks for Super Admin, Registration Admin, Court 1 Umpire, Court 2 Umpire, and Viewer

## v16 database-only state update

The React app now uses PostgreSQL through `/api/state` as the single source of truth for tournament data. Browser `localStorage` reads and writes were removed. Staff role persistence remains temporarily in `sessionStorage` until backend authentication is added in the next phase.
