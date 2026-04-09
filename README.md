# Numeris

Accounting dashboard monorepo: **React (Vite)** frontend and **Express + Prisma** backend.

## Prerequisites

- **Node.js** 18+
- **SQLite** is the default (`backend/prisma/dev.db`, created by `migrate dev`). You do not need Docker or PostgreSQL for local development.

## Backend setup

```bash
cd backend
cp .env.example .env   # default DATABASE_URL is SQLite file:./dev.db
npm install
npx prisma migrate dev
npm run seed           # loads sample data
npm run dev            # starts API on port 3000 (or PORT in .env)
```

The API listens at **http://localhost:3000** by default.

**Demo login (after seed):** `thomas@numeris.app` / `numeris123`

CI / production apply: `npx prisma migrate deploy` then `npm run seed`.

## Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 — proxies /api to the backend
```

Set `VITE_API_BASE_URL` only if the API is not proxied (see `frontend/.env.example`).

## Project layout

```
backend/
  prisma/
    schema.prisma
    seed.js
    migrations/
  src/
    index.js
    routes/
      index.js
      *.routes.js
    middleware/
    lib/
frontend/
  src/
```

## CORS

The API allows **http://localhost:5173** and **http://127.0.0.1:5173** with credentials.

## Scripts (backend)

| Script | Description |
|--------|-------------|
| `npm run dev` | API with `--watch` |
| `npm start` | API without watch |
| `npm run seed` | Load sample data |
| `npx prisma migrate dev` | Dev migrations |
| `npx prisma migrate deploy` | Apply migrations (CI/prod) |
| `npx prisma studio` | Database GUI |
