import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthConfig } from './auth.js';
import type { MediaStorageConfig } from './mediaStorage.js';
import { parseMediaStorageConfig } from './mediaStorage.js';
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
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REFRESH_TOKEN: z.string().optional(),
  ZOHO_ORGANIZATION_ID: z.string().optional(),
  ZOHO_API_BASE_URL: z.string().url().optional(),
  ZOHO_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().optional(),
  ZOHO_ACTIVE_ORDER_STATUSES: z.string().optional()
});

export type ApiConfig = {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  corsOrigin: string;
  auth: AuthConfig;
  mediaStorage: MediaStorageConfig;
  dispatchRepository: DispatchRepository;
  zoho?: {
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
  const zoho = parseZohoConfig(parsed);

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
    mediaStorage: parseMediaStorageConfig(env),
    dispatchRepository: new PrismaDispatchRepository(prisma),
    zoho
  };
}

function parseZohoConfig(parsed: z.infer<typeof envSchema>): ApiConfig['zoho'] {
  const zohoFields = {
    ZOHO_CLIENT_ID: parsed.ZOHO_CLIENT_ID?.trim(),
    ZOHO_CLIENT_SECRET: parsed.ZOHO_CLIENT_SECRET?.trim(),
    ZOHO_REFRESH_TOKEN: parsed.ZOHO_REFRESH_TOKEN?.trim(),
    ZOHO_ORGANIZATION_ID: parsed.ZOHO_ORGANIZATION_ID?.trim(),
    ZOHO_API_BASE_URL: parsed.ZOHO_API_BASE_URL?.trim(),
    ZOHO_SYNC_INTERVAL_MINUTES: parsed.ZOHO_SYNC_INTERVAL_MINUTES,
    ZOHO_ACTIVE_ORDER_STATUSES: parsed.ZOHO_ACTIVE_ORDER_STATUSES?.trim()
  };

  const hasAnyZohoConfig = Object.values(zohoFields).some((value) => value !== undefined && value !== '');
  if (!hasAnyZohoConfig) {
    return undefined;
  }

  const missingFields = Object.entries(zohoFields)
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(`Incomplete Zoho configuration. Missing: ${missingFields.join(', ')}`);
  }

  const activeStatuses = zohoFields.ZOHO_ACTIVE_ORDER_STATUSES!
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean);

  if (activeStatuses.length === 0) {
    throw new Error('ZOHO_ACTIVE_ORDER_STATUSES must include at least one non-empty status');
  }

  return {
    clientId: zohoFields.ZOHO_CLIENT_ID!,
    clientSecret: zohoFields.ZOHO_CLIENT_SECRET!,
    refreshToken: zohoFields.ZOHO_REFRESH_TOKEN!,
    organizationId: zohoFields.ZOHO_ORGANIZATION_ID!,
    apiBaseUrl: zohoFields.ZOHO_API_BASE_URL!,
    syncIntervalMinutes: zohoFields.ZOHO_SYNC_INTERVAL_MINUTES!,
    activeStatuses
  };
}
