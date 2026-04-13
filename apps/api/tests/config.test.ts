import { buildConfigFromEnv } from '../src/app.js';

describe('buildConfigFromEnv', () => {
  const baseEnv = {
    PORT: '3001',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/bsm_dashboard?schema=public',
    DIRECT_DATABASE_URL: 'postgresql://user:password@localhost:5432/bsm_dashboard?schema=public',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: 'super-secret-value',
    AUTH_SEED_EMAIL: 'admin@bsm.local',
    AUTH_SEED_NAME: 'BSM Admin',
    AUTH_SEED_PASSWORD: 'ChangeMe123!'
  } satisfies NodeJS.ProcessEnv;

  it('builds config when Neon/Postgres database envs are present', async () => {
    const config = await buildConfigFromEnv(baseEnv);

    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('development');
    expect(config.auth.jwtSecret).toBe('super-secret-value');
  });

  it('fails clearly when DATABASE_URL is missing', async () => {
    await expect(buildConfigFromEnv({ ...baseEnv, DATABASE_URL: undefined })).rejects.toThrow(/DATABASE_URL/i);
  });

  it('rejects non-postgres database URLs', async () => {
    await expect(
      buildConfigFromEnv({
        ...baseEnv,
        DATABASE_URL: 'mysql://user:password@localhost:3306/bsm_dashboard'
      })
    ).rejects.toThrow(/postgres connection string/i);
  });
});
