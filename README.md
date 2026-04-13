# BSM Order Management Dashboard

Monorepo for the BSM internal order and dispatch dashboard.

## Apps
- `apps/api` - Express + TypeScript backend API
- `apps/web` - frontend workspace placeholder
- `packages/shared` - shared types

## Quick start
1. Copy `.env.example` to `.env`
2. Start Postgres: `docker compose up -d`
3. Install deps: `pnpm install`
4. Run tests: `pnpm test:run`
5. Start API: `pnpm dev`
