import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { createAuthRouter } from './routes/auth.js';
import { createMachineUnitsRouter } from './routes/machineUnits.js';
import { createMediaRouter } from './routes/media.js';
import { createOrdersRouter } from './routes/orders.js';
import { AuthService, type AuthConfig } from './lib/auth.js';
import { prisma } from './lib/prisma.js';
import { PrismaDispatchRepository, type DispatchRepository } from './repositories/dispatchRepository.js';

const postgresUrlSchema = z.string().url().refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
  message: 'Must be a postgres connection string'
});

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: postgresUrlSchema,
  DIRECT_DATABASE_URL: postgresUrlSchema.optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(12),
  AUTH_SEED_EMAIL: z.string().email().default('admin@bsm.local'),
  AUTH_SEED_NAME: z.string().min(1).default('BSM Admin'),
  AUTH_SEED_PASSWORD: z.string().min(8).default('ChangeMe123!')
});

export type AppConfig = {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  corsOrigin: string;
  auth: AuthConfig;
  dispatchRepository: DispatchRepository;
};

export async function buildConfigFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const parsed = envSchema.parse(env);
  const passwordHash = await bcrypt.hash(parsed.AUTH_SEED_PASSWORD, 10);

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    corsOrigin: parsed.CORS_ORIGIN,
    auth: {
      jwtSecret: parsed.JWT_SECRET,
      seedUser: {
        id: 'seed_admin',
        email: parsed.AUTH_SEED_EMAIL,
        name: parsed.AUTH_SEED_NAME,
        role: 'ADMIN',
        passwordHash
      }
    },
    dispatchRepository: new PrismaDispatchRepository(prisma)
  };
}

export function createApp(overrides?: Partial<AppConfig>) {
  const authConfig: AuthConfig = overrides?.auth ?? {
    jwtSecret: 'test-only-secret',
    seedUser: {
      id: 'seed_admin',
      email: 'admin@bsm.local',
      name: 'BSM Admin',
      role: 'ADMIN',
      passwordHash: bcrypt.hashSync('ChangeMe123!', 10)
    }
  };

  const app = express();
  const authService = new AuthService(authConfig);
  const dispatchRepository = overrides?.dispatchRepository ?? new PrismaDispatchRepository(prisma);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: overrides?.corsOrigin ?? 'http://localhost:5173',
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'bsm-order-management-api'
    });
  });

  app.get('/ready', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      checks: {
        api: 'up'
      }
    });
  });

  app.use('/auth', createAuthRouter(authService));
  app.use('/orders', createOrdersRouter(dispatchRepository));
  app.use('/machine-units', createMachineUnitsRouter(dispatchRepository));
  app.use('/media', createMediaRouter(dispatchRepository));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    response.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
