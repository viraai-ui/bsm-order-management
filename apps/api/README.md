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
pnpm --filter @bsm/api build
```

Notes:
- The running API should use `DATABASE_URL`.
- Migration jobs or CI should use `DIRECT_DATABASE_URL`.
- If your deployment platform runs migrations in a separate step, set both variables there as well.
