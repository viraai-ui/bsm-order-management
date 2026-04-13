# BSM Order Management Dashboard

Monorepo for the BSM internal order and dispatch dashboard.

## Apps
- `apps/api` - Express + TypeScript backend API
- `apps/web` - Vite frontend
- `packages/shared` - shared types

## Environment files
- `apps/api/.env.example` - backend env template, including Neon + Prisma variables
- `apps/web/.env.example` - frontend env template
- `.env.example` - root convenience example for local development

## Quick start with Neon
1. Create a Neon project and database.
2. Copy `.env.example` to `.env` for a simple root-local setup, or create per-app env files from the examples in `apps/api` and `apps/web`.
3. Fill in `DATABASE_URL` with Neon's pooled connection string.
4. Fill in `DIRECT_DATABASE_URL` with Neon's direct connection string.
5. Install deps: `pnpm install`
6. Generate Prisma client: `pnpm --filter @bsm/api prisma:generate`
7. Run local migrations against your Neon database: `pnpm --filter @bsm/api prisma:migrate:dev`
8. Run tests: `pnpm test:run`
9. Start API: `pnpm dev`

## Deploying the API
Use the pooled `DATABASE_URL` for the running app and `DIRECT_DATABASE_URL` for migration jobs.

```bash
pnpm --filter @bsm/api prisma:generate
pnpm --filter @bsm/api prisma:migrate:deploy
pnpm --filter @bsm/api build
```

See `apps/api/README.md` for the Neon-specific backend setup notes.
