import { buildConfigFromEnv } from '../src/app.js';
import { parseMediaStorageConfig } from '../src/lib/mediaStorage.js';

describe('media storage config', () => {
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
    ZOHO_ACTIVE_ORDER_STATUSES: 'confirmed,packed,shipped'
  } satisfies NodeJS.ProcessEnv;

  it('defaults to local storage with sane upload settings', async () => {
    const config = await buildConfigFromEnv(baseEnv);

    expect(config.mediaStorage).toEqual({
      provider: 'local',
      maxUploadSizeBytes: 25 * 1024 * 1024,
      keyPrefix: 'machine-unit-media',
      localBasePath: 'uploads/media',
      publicBaseUrl: null
    });
  });

  it('parses full s3-compatible storage settings', () => {
    const config = parseMediaStorageConfig({
      ...baseEnv,
      MEDIA_STORAGE_PROVIDER: 's3',
      MEDIA_UPLOAD_MAX_BYTES: '10485760',
      MEDIA_STORAGE_KEY_PREFIX: 'dispatch-proof',
      MEDIA_STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com/bsm',
      MEDIA_STORAGE_S3_BUCKET: 'bsm-media',
      MEDIA_STORAGE_S3_REGION: 'auto',
      MEDIA_STORAGE_S3_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
      MEDIA_STORAGE_S3_ACCESS_KEY_ID: 'access-key',
      MEDIA_STORAGE_S3_SECRET_ACCESS_KEY: 'secret-key',
      MEDIA_STORAGE_S3_FORCE_PATH_STYLE: 'true'
    });

    expect(config).toEqual({
      provider: 's3',
      maxUploadSizeBytes: 10 * 1024 * 1024,
      keyPrefix: 'dispatch-proof',
      publicBaseUrl: 'https://cdn.example.com/bsm',
      bucket: 'bsm-media',
      region: 'auto',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      forcePathStyle: true
    });
  });

  it('fails clearly when s3 storage is missing required settings', () => {
    expect(() =>
      parseMediaStorageConfig({
        ...baseEnv,
        MEDIA_STORAGE_PROVIDER: 's3'
      })
    ).toThrow(/MEDIA_STORAGE_S3_BUCKET/i);
  });
});
