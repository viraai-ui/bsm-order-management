import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { createAuthRouter } from './routes/auth.js';
import { createMachineUnitsRouter } from './routes/machineUnits.js';
import { createMediaRouter } from './routes/media.js';
import { createOrdersRouter } from './routes/orders.js';
import { AuthService, type AuthConfig } from './lib/auth.js';
import { buildApiConfig, type ApiConfig } from './lib/env.js';
import { createMediaStorage, parseMediaStorageConfig, type MediaStorage } from './lib/mediaStorage.js';
import { prisma } from './lib/prisma.js';
import { PrismaDispatchRepository } from './repositories/dispatchRepository.js';
import { createZohoClient } from './services/zohoClient.js';
import { createZohoSyncService, type ZohoSyncService } from './services/zohoSync.js';

export type AppConfig = ApiConfig;

type CreateAppOverrides = Partial<AppConfig> & {
  zohoSyncService?: ZohoSyncService;
  mediaStorageService?: MediaStorage;
};

export async function buildConfigFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  return buildApiConfig(env);
}

export function createApp(overrides?: CreateAppOverrides) {
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
  const mediaStorage = overrides?.mediaStorageService
    ?? createMediaStorage(overrides?.mediaStorage ?? parseMediaStorageConfig(process.env));
  const zohoSyncService = overrides?.zohoSyncService ?? (overrides?.zoho
    ? createZohoSyncService({
        dispatchRepository,
        zohoClient: createZohoClient(overrides.zoho),
        intervalMs: overrides.zoho.syncIntervalMinutes * 60 * 1000
      })
    : undefined);

  zohoSyncService?.start();

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
  app.use('/orders', createOrdersRouter(dispatchRepository, zohoSyncService));
  app.use('/machine-units', createMachineUnitsRouter(dispatchRepository, mediaStorage, overrides?.mediaStorage?.maxUploadSizeBytes));
  app.use('/media', createMediaRouter(dispatchRepository, mediaStorage));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
      response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        error: error.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file exceeds the maximum allowed size'
          : 'Invalid multipart upload payload',
      });
      return;
    }

    console.error(error);
    response.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
