import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthRouter } from './routes/auth.js';
import { createMachineUnitsRouter } from './routes/machineUnits.js';
import { createMediaRouter } from './routes/media.js';
import { createOrdersRouter } from './routes/orders.js';
import { AuthService, type AuthConfig } from './lib/auth.js';
import { buildApiConfig, type ApiConfig } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import { PrismaDispatchRepository } from './repositories/dispatchRepository.js';

export type AppConfig = ApiConfig;

export async function buildConfigFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  return buildApiConfig(env);
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
