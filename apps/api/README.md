# @bsm/api

Express + Prisma backend for the BSM order dashboard.

## Environment
Create `apps/api/.env` from `apps/api/.env.example` for local development, or set the same variables in your host/deployment platform.

Required:
- `DATABASE_URL`: Prisma runtime connection string. For Neon, use the pooled connection string for the app.
- `JWT_SECRET`: signing secret for auth cookies/JWTs.

Recommended for Prisma migrations:
- `DIRECT_DATABASE_URL`: direct Postgres connection string. For Neon, use the non-pooled connection string here so `prisma migrate` can run outside PgBouncer.

## Neon setup
1. Create a Neon project and database.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Copy the direct connection string into `DIRECT_DATABASE_URL`.
4. Ensure both URLs include `sslmode=require`.

Example shape:
```env
DATABASE_URL="postgresql://USER:PASSWORD@EP-...-pooler.REGION.aws.neon.tech/DB?sslmode=require&pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@EP-....REGION.aws.neon.tech/DB?sslmode=require"
```

## Local workflow
```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @bsm/api prisma:generate
pnpm --filter @bsm/api prisma:migrate:dev
pnpm --filter @bsm/api dev
```

## Deploying against Neon
```bash
pnpm --filter @bsm/api prisma:generate
pnpm --filter @bsm/api prisma:migrate:deploy
pnpm --filter @bsm/api prisma:seed
pnpm --filter @bsm/api build
```

## Railway deploy shape
This repo includes a root `railway.json` so Railway can build from the monorepo root and start the API from `apps/api/dist/index.js`.

Recommended Railway variables:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...-pooler.../bsm_dashboard?sslmode=require&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://.../bsm_dashboard?sslmode=require
CORS_ORIGIN=https://your-frontend-domain.vercel.app
JWT_SECRET=replace-with-a-long-random-secret
AUTH_SEED_EMAIL=admin@bsm.local
AUTH_SEED_NAME=BSM Admin
AUTH_SEED_PASSWORD=ChangeMe123!
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...
ZOHO_ORGANIZATION_ID=60019065510
ZOHO_API_BASE_URL=https://www.zohoapis.in
ZOHO_SYNC_INTERVAL_MINUTES=15
ZOHO_ACTIVE_ORDER_STATUSES=confirmed,open,pending_dispatch
```

First live boot:
```bash
pnpm --filter @bsm/api prisma:migrate:deploy
pnpm --filter @bsm/api prisma:seed
pnpm --filter @bsm/api start
```

Notes:
- The running API should use `DATABASE_URL`.
- Migration jobs or CI should use `DIRECT_DATABASE_URL`.
- If your deployment platform runs migrations in a separate step, set both variables there as well.
- Seed is idempotent, it only inserts the default dispatch data when the orders table is empty.
- Zoho sync starts with the API process and runs on the configured interval.
- Manual sync is available via `POST /orders/sync`.

## Media uploads and dispatch completion
- Upload machine-unit proof with `POST /machine-units/:id/media/upload` using `multipart/form-data`.
- Send `kind` (`IMAGE`, `VIDEO`, or `DOCUMENT`) plus the uploaded `file` field.
- Complete handoff with `POST /machine-units/:id/dispatch` and optional `dispatchNotes` JSON.
- Dispatch completion is blocked until the machine unit has a serial number, QR code, at least one image, and the required testing videos.
- Local development stores uploads with the configured local media storage provider. Production can switch to the S3-compatible provider via the media storage env vars in `.env.example`.
