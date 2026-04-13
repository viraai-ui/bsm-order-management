import { buildApiConfig } from '../src/lib/env.js';

describe('buildApiConfig', () => {
  const baseEnv = {
    PORT: '3001',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/bsm_dashboard?schema=public',
    DIRECT_DATABASE_URL: 'postgresql://user:password@localhost:5432/bsm_dashboard?schema=public',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: 'super-secret-value',
    AUTH_SEED_EMAIL: 'admin@bsm.local',
    AUTH_SEED_NAME: 'BSM Admin',
    AUTH_SEED_PASSWORD: 'ChangeMe123!',
    ZOHO_CLIENT_ID: 'zoho-client-id',
    ZOHO_CLIENT_SECRET: 'zoho-client-secret',
    ZOHO_REFRESH_TOKEN: 'zoho-refresh-token',
    ZOHO_ORGANIZATION_ID: '1234567890',
    ZOHO_API_BASE_URL: 'https://www.zohoapis.com/inventory/v1',
    ZOHO_SYNC_INTERVAL_MINUTES: '15',
    ZOHO_ACTIVE_ORDER_STATUSES: 'confirmed, packed , shipped '
  } satisfies NodeJS.ProcessEnv;

  it('parses core api config and zoho settings', async () => {
    const config = await buildApiConfig(baseEnv);

    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('development');
    expect(config.auth.jwtSecret).toBe('super-secret-value');
    expect(config.zoho).toEqual({
      clientId: 'zoho-client-id',
      clientSecret: 'zoho-client-secret',
      refreshToken: 'zoho-refresh-token',
      organizationId: '1234567890',
      apiBaseUrl: 'https://www.zohoapis.com/inventory/v1',
      syncIntervalMinutes: 15,
      activeStatuses: ['confirmed', 'packed', 'shipped']
    });
  });

  it('fails clearly when DATABASE_URL is missing', async () => {
    await expect(buildApiConfig({ ...baseEnv, DATABASE_URL: undefined })).rejects.toThrow(/DATABASE_URL/i);
  });

  it('rejects non-postgres database URLs', async () => {
    await expect(
      buildApiConfig({
        ...baseEnv,
        DATABASE_URL: 'mysql://user:password@localhost:3306/bsm_dashboard'
      })
    ).rejects.toThrow(/postgres connection string/i);
  });

  it('rejects blank zoho active order statuses after trimming', async () => {
    await expect(
      buildApiConfig({
        ...baseEnv,
        ZOHO_ACTIVE_ORDER_STATUSES: ' , , '
      })
    ).rejects.toThrow(/ZOHO_ACTIVE_ORDER_STATUSES must include at least one non-empty status/i);
  });
});
