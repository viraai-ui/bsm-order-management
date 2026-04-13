import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthConfig } from './auth.js';
import { prisma } from './prisma.js';
import { PrismaDispatchRepository, type DispatchRepository } from '../repositories/dispatchRepository.js';

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
  AUTH_SEED_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  ZOHO_CLIENT_ID: z.string().min(1),
  ZOHO_CLIENT_SECRET: z.string().min(1),
  ZOHO_REFRESH_TOKEN: z.string().min(1),
  ZOHO_ORGANIZATION_ID: z.string().min(1),
  ZOHO_API_BASE_URL: z.string().url(),
  ZOHO_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive(),
  ZOHO_ACTIVE_ORDER_STATUSES: z.string().min(1)
});

export type ApiConfig = {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  corsOrigin: string;
  auth: AuthConfig;
  dispatchRepository: DispatchRepository;
  zoho: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    organizationId: string;
    apiBaseUrl: string;
    syncIntervalMinutes: number;
    activeStatuses: string[];
  };
};

export async function buildApiConfig(env: NodeJS.ProcessEnv = process.env): Promise<ApiConfig> {
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
    dispatchRepository: new PrismaDispatchRepository(prisma),
    zoho: {
      clientId: parsed.ZOHO_CLIENT_ID,
      clientSecret: parsed.ZOHO_CLIENT_SECRET,
      refreshToken: parsed.ZOHO_REFRESH_TOKEN,
      organizationId: parsed.ZOHO_ORGANIZATION_ID,
      apiBaseUrl: parsed.ZOHO_API_BASE_URL,
      syncIntervalMinutes: parsed.ZOHO_SYNC_INTERVAL_MINUTES,
      activeStatuses: parsed.ZOHO_ACTIVE_ORDER_STATUSES.split(',').map((status) => status.trim()).filter(Boolean)
    }
  };
}
