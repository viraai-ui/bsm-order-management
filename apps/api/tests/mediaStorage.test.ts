import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildConfigFromEnv } from '../src/app.js';
import { createMediaStorage, parseMediaStorageConfig } from '../src/lib/mediaStorage.js';
import { createLocalMediaStorage } from '../src/services/localMediaStorage.js';
import { createS3MediaStorage } from '../src/services/s3MediaStorage.js';

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

  it('creates a local storage provider from config', () => {
    const storage = createMediaStorage({
      provider: 'local',
      maxUploadSizeBytes: 25 * 1024 * 1024,
      keyPrefix: 'machine-unit-media',
      localBasePath: 'uploads/media',
      publicBaseUrl: null,
    });

    expect(storage).toMatchObject({
      saveUpload: expect.any(Function),
      deleteObject: expect.any(Function),
      buildPublicUrl: expect.any(Function),
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

describe('local media storage', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it('saves uploads to disk and deletes them again', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'bsm-media-'));
    directories.push(tempDir);

    const storage = createLocalMediaStorage({
      provider: 'local',
      maxUploadSizeBytes: 5 * 1024 * 1024,
      keyPrefix: 'dispatch-proof',
      localBasePath: tempDir,
      publicBaseUrl: 'https://cdn.example.com/media',
    });

    const saved = await storage.saveUpload({
      machineUnitId: 'MU-LOCAL-1',
      mediaKind: 'IMAGE',
      originalFileName: 'proof photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('proof-image'),
    });

    const persistedPath = path.resolve(tempDir, saved.storagePath);
    expect(saved.storagePath).toContain('dispatch-proof/MU-LOCAL-1/image/');
    expect(saved.publicUrl).toBe(`https://cdn.example.com/media/${saved.storagePath}`);
    expect(saved.sizeBytes).toBe(Buffer.byteLength('proof-image'));
    expect(await readFile(persistedPath, 'utf8')).toBe('proof-image');

    await storage.deleteObject(saved.storagePath);

    await expect(access(persistedPath)).rejects.toThrow();
  });
});

describe('s3 media storage', () => {
  it('uploads and deletes objects through the configured s3 client', async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = createS3MediaStorage({
      provider: 's3',
      maxUploadSizeBytes: 10 * 1024 * 1024,
      keyPrefix: 'dispatch-proof',
      publicBaseUrl: 'https://cdn.example.com/bsm',
      bucket: 'bsm-media',
      region: 'auto',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      forcePathStyle: true,
    }, { send } as never);

    const saved = await storage.saveUpload({
      machineUnitId: 'MU-S3-1',
      mediaKind: 'VIDEO',
      originalFileName: 'factory run.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('video-bytes'),
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: 'bsm-media',
      Key: saved.storagePath,
      ContentType: 'video/mp4',
      Body: Buffer.from('video-bytes'),
    });
    expect(saved.publicUrl).toBe(`https://cdn.example.com/bsm/${saved.storagePath}`);
    expect(saved.sizeBytes).toBe(Buffer.byteLength('video-bytes'));

    await storage.deleteObject(saved.storagePath);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].input).toMatchObject({
      Bucket: 'bsm-media',
      Key: saved.storagePath,
    });
  });
});
