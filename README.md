# DnD Quest Board (MVP Monorepo) 🏰

Spec‑driven implementation scaffold for the DnD Quest Board web app (see `./specs/specV1.md`).

**Now featuring a fully-themed Fantasy Tavern UI!** 🎨

## Packages

- `shared` — TypeScript domain types shared by backend & frontend
- `backend` — Express + Socket.IO in‑memory API server (MVP)
- `frontend` — Next.js 14 App Router UI (React Query + Zustand + Tailwind) **with Fantasy Tavern Theme**

## Current MVP Scope Implemented

- **Auth**: register/login (JWT access token only, in-memory users)
- **Boards**: create/list/detail/update (lock), invite players, basic membership, quest ordering
- **Quests**: create/list/detail/edit/archive (in-memory), reorder, accept, decline (local per-user preference store), completion (assignment + quest auto complete)
- **Inventory**: accepted quests (QuestAssignment) listing + completion
- **Real‑time**: board + quest updates via Socket.IO broadcast (`board:update`, `quest:update`)
- **Admin**: seeded admin account, user listing and role promotion
- **🎨 Fantasy Tavern Theme**: Fully immersive D&D-styled UI with parchment cards, wooden toolbars, masonry layout, and medieval aesthetics

## ✨ Theme Features

The application now features a complete **Fantasy Tavern Theme** inspired by medieval quest boards:

- 🎨 **Rich Color Palette**: Oak, leather, parchment, ink, with crimson/gold/brass accents
- 🖋️ **Fantasy Typography**: Cinzel Decorative for titles, Inter for body text
- 📜 **Parchment Quest Cards**: Masonry grid layout with torn-edge effects
- 🏰 **Wooden Toolbars**: Dark leather navigation bars
- ⚔️ **Themed Components**: Difficulty badges, status pills, wax seal-style buttons
- 📱 **Fully Responsive**: Mobile-first with sticky footers and optimized touch targets
- ♿ **WCAG AA Accessible**: High contrast, keyboard navigation, screen reader friendly

**See Documentation:**
- 📖 [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Full feature overview
- 🎨 [THEME_GUIDE.md](./THEME_GUIDE.md) - Developer quick reference
- 📋 [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - QA testing guide
- 📐 [specs/design_proposalV1.md](./specs/design_proposalV1.md) - Original design spec

## Not Yet Implemented (Deferred per Spec)

- Persistence (PostgreSQL), Redis presence, comments, abandon state, parties management UI, file/image uploads, search performance optimizations, RBAC hardening (beyond simple role checks), refresh tokens, invite tokens, OpenAPI docs, automated test suite.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm (comes with Node)

## Install & Run (Dev)

```bash
# From repo root
npm install
# Build shared (ensures dist for types)
npm -w shared run build
# Run all packages concurrently (shared watch, backend, frontend)
npm run dev
```

**With Prisma Backend (Persistent Database):**
```bash
# Run with Prisma SQLite backend instead of in-memory
npm run dev:prisma
```

**Backend Only:**
```bash
# In-memory backend only
npm run backend:dev

# Prisma backend only
npm run backend:dev:prisma
```

Frontend: http://localhost:3000  
Backend: http://localhost:4000 (in-memory) or http://localhost:4000 (Prisma)

Set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` if you change backend port.

### Database Configuration (Prisma)

The Prisma backend uses SQLite for development. Configuration is in `backend/.env`:

```env
DATABASE_URL=file:/Users/strise/AquaProjects/Work/DnDBoard/backend/prisma/dev.db
PERSISTENCE=prisma
```

**Note:** The DATABASE_URL must use an absolute path for SQLite. Update this path if you clone the repo to a different location.

**Database Migrations:**
```bash
# Run migrations
cd backend
npm run prisma:migrate

# Generate Prisma Client (after schema changes)
npm run prisma:generate
```

## Default Admin Account

A seed Admin user is created at backend startup if it does not already exist.

| Field | Default |
|-------|---------|
| Email | `admin@example.com` |
| Password | `admin123` |

Override with environment variables:
```
ADMIN_EMAIL=your_admin@mail.com
ADMIN_PASSWORD=strongpassword
```
WARNING: Do NOT use the defaults in any shared / deployed environment.

## Basic API Smoke (Manual)

```bash
# Register
curl -s -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dm1@example.com","password":"pass123","displayName":"DM1"}'
# Copy accessToken from response into shell var TOKEN
TOKEN=... # set manually

# Create board
curl -s -X POST http://localhost:4000/boards \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Campaign Alpha"}'

# List boards
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/boards

# Create quest (replace BOARD_ID)
curl -s -X POST http://localhost:4000/boards/BOARD_ID/quests \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Bandits on the East Road","summary":"Merchants report attacks.","difficulty":"Medium"}'

# List quests
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/boards/BOARD_ID/quests

# Accept quest
curl -s -X POST http://localhost:4000/quests/QUEST_ID/accept -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'

# Complete assignment (replace ASSIGNMENT_ID)
curl -s -X POST http://localhost:4000/assignments/ASSIGNMENT_ID/complete -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"notes":"Victory!"}'
```

## New / Extended Endpoints (MVP additions)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/boards/:boardId/quests?includeDeclined=true` | Add `includeDeclined=true` to see quests you previously declined. |
| POST | `/assignments/:id/complete` | Marks assignment Completed; quest may become Completed. |
| GET | `/quests/:id/assignments` | List all assignments for a quest (membership required). |
| GET | `/admin/users` | Admin only – list users & roles. |
| POST | `/admin/promote` | Admin only – body: `{ userId, role? }` (default role added = `Admin`). |

## Frontend Flows

1. Open http://localhost:3000/login — register or login
2. Create a Board
3. Open Board, add Quests, reorder with ▲ / ▼ (DM only)
4. Click a Quest, Accept / Decline
5. Visit Inventory at `/inventory` (optionally filter by board, complete accepted quests)
6. (Optional) Login as Admin to exercise admin API via curl / future UI

## Code Structure Highlights

```
shared/src/index.ts      # Domain model (spec aligned)
backend/src/index.ts     # Express + Socket.IO API (in-memory) + admin seeding
frontend/app/*           # Next.js App Router pages
frontend/lib/api.ts      # Typed fetch wrappers (incl. assignment completion)
frontend/store/auth.ts   # Zustand auth store
```

## Development Notes

- **In-memory backend:** Data resets on server restart.
- **Prisma backend:** Data persists in SQLite database (`backend/prisma/dev.db`).
- JWT secret is hard-coded for MVP (`dev-secret-change`). DO NOT use in production.
- Reordering updates `board.questOrder` for deterministic quest listing.
- Decline endpoint stores a local (server memory) marker only; filtering hides declined quests unless `includeDeclined=true`.
- Admin seeding logs plain credentials to console (development convenience only).
- **Important:** The `DATABASE_URL` in `backend/.env` must use an absolute path for SQLite. See [DATABASE_FIX.md](./DATABASE_FIX.md) for details.

## Automated Smoke Script

Run a scripted end-to-end smoke (register → board → quest → accept → complete) plus admin listing:
```bash
npm run smoke
```
Output includes IDs and status codes; non-zero exit signals a failure.

## Persistence Modes (Migration In Progress)

The backend now supports two runtime modes:

1. In-memory (legacy, fast iteration) — Original implementation (`src/index.ts`) serving on port 4000.
2. Prisma + SQLite (development persistence) — New implementation (`src/server-prisma.ts`) served via feature flag on port 4100 by default.

Feature flag launcher: `backend/src/start.ts`.

Environment toggle:
```
PERSISTENCE=prisma   # starts Prisma-backed server
# (unset)            # starts legacy in-memory server
```

Development commands:
```
# Legacy (in-memory) dev
npm -w backend run dev

# Prisma (persistent) dev
npm -w backend run dev:prisma
```

Ports:
- 4000 → in-memory (legacy)
- 4100 → prisma (persistent)

Database (SQLite dev) configuration (`backend/.env`):
```
DATABASE_URL="file:./dev.db"
```

To reset the database:
```
rm backend/dev.db && npm -w backend run prisma:migrate
```

### Quest & Data Serialization
Prisma schema stores `images`, `tags` as comma-separated strings and `rewardsJson` as JSON text. The server normalizes these into arrays / objects for all quest API responses & socket events.

### Smoke & Persistence Scripts

Scripts are provided to validate both modes:
```
# Smoke test (legacy server, port 4000)
npm run smoke

# Smoke test against Prisma server (auto-starts via feature flag if not running)
npm run smoke:prisma

# Persistence verification (creates quest, restarts server, verifies data)
npm run smoke:prisma:persist
```
The unified smoke script auto-detects `BASE_URL` port 4100 and launches the Prisma server (`start.ts`).

### Migration Status Checklist
- [x] Prisma schema & initial migration
- [x] Prisma client generation
- [x] Core endpoints parity (boards, quests CRUD, reorder, accept/complete/abandon, comments, admin promote/list, inventory)
- [x] Socket events (board:update, quest:update, comment:new, presence:update) — Prisma mode
- [x] Quest serialization normalization (images/tags/rewards arrays)
- [x] Decline filtering parity (transient, not persisted yet)
- [x] Presence (transient in-memory set for Prisma mode)
- [x] Feature flag entrypoint (`start.ts`)
- [x] Smoke & persistence scripts
- [ ] Optional: unify socket event constants in Prisma server by importing from `@dndboard/shared`
- [ ] Optional: persist declines & presence (future Postgres/Redis phase)

### Next Migration Steps (Recommended)
1. Introduce Postgres datasource & production-ready env config.
2. Extract transient decline/presence into durable layers (Redis or Postgres tables).
3. Write automated unit & integration tests (e.g. Vitest + Supertest) for Prisma endpoints.
4. Remove legacy in-memory server once confidence & coverage are sufficient.
5. Introduce data migrations for future schema evolution (indexing performance fields, audit logs).

## Next Steps (Roadmap Quick Wins)

- Persist data (Postgres) + repository layer
- Abandon quest state + better status transitions
- Comments & presence channels
- OpenAPI spec generation + test suite (Supertest / Vitest)
- Drag-and-drop UI (replace up/down) & Masonry layout
- Refresh tokens & secure cookie storage
- CI pipeline (lint + typecheck + test)
- Filter / search UI on frontend
- Admin UI section (user list / promote)

## License

MIT (MVP scaffold). Replace / update as needed.

## Deployment (SQLite + Render Notes)

The Prisma schema expects `DATABASE_URL` to be set. For local dev we place a `.env` file alongside the Prisma schema at `backend/prisma/.env`:
```
DATABASE_URL="file:./dev.db"
```
Prisma automatically loads that file when running inside the `backend` workspace.

On Render (current `render.yaml`), we explicitly set:
```
DATABASE_URL = file:./prisma/dev.db
```
Because the start command changes into the `backend` directory (`cd backend && ...`), this relative path resolves to `backend/prisma/dev.db`.

If you encountered the deployment error:
```
Error: Environment variable not found: DATABASE_URL. (P1012)
```
make sure either:
1. The `DATABASE_URL` env var is defined in the Render dashboard or `render.yaml`, OR
2. You have committed a `render.yaml` containing a value for `DATABASE_URL` (as now done), OR
3. (Local only) you created `backend/prisma/.env` with the variable.

### Persistence Caveats (SQLite on Render)
SQLite on ephemeral containers will not persist across deploys unless you attach a persistent disk. For production, migrate to Postgres (adjust `provider = "postgresql"` and set a Postgres connection string). Until then, data loss on restart is expected.

### Recommended Next Step for Production
- Provision a managed Postgres instance
- Set `DATABASE_URL` to the Postgres URI
- Run `npm -w backend run prisma:migrate:deploy`
- Remove committed `dev.db` from version control and add `backend/prisma/dev.db` to `.gitignore`

