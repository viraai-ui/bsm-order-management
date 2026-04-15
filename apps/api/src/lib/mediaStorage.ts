import { z } from 'zod';
import type { MediaKind } from './dispatch.js';
import { createLocalMediaStorage } from '../services/localMediaStorage.js';
import { createS3MediaStorage } from '../services/s3MediaStorage.js';

const uploadSizeSchema = z.coerce.number().int().positive().default(25 * 1024 * 1024);
const keyPrefixSchema = z.string().trim().default('machine-unit-media').transform((value) => value.replace(/^\/+|\/+$/g, ''));
const publicBaseUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .transform((value) => value ? value.replace(/\/+$/g, '') : null);

const baseEnvSchema = z.object({
  MEDIA_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  MEDIA_UPLOAD_MAX_BYTES: uploadSizeSchema,
  MEDIA_STORAGE_KEY_PREFIX: keyPrefixSchema,
  MEDIA_STORAGE_PUBLIC_BASE_URL: publicBaseUrlSchema,
  MEDIA_STORAGE_LOCAL_BASE_PATH: z.string().trim().default('uploads/media')
});

export type MediaStorageProvider = 'local' | 's3';

export type LocalMediaStorageConfig = {
  provider: 'local';
  maxUploadSizeBytes: number;
  keyPrefix: string;
  localBasePath: string;
  publicBaseUrl: string | null;
};

export type S3MediaStorageConfig = {
  provider: 's3';
  maxUploadSizeBytes: number;
  keyPrefix: string;
  publicBaseUrl: string | null;
  bucket: string;
  region: string;
  endpoint: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type MediaStorageConfig = LocalMediaStorageConfig | S3MediaStorageConfig;

export type SaveUploadInput = {
  machineUnitId: string;
  mediaKind: MediaKind;
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type SaveUploadResult = {
  storagePath: string;
  publicUrl: string | null;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface MediaStorage {
  saveUpload(file: SaveUploadInput): Promise<SaveUploadResult>;
  deleteObject(path: string): Promise<void>;
  buildPublicUrl(path: string): string | null;
}

export function createMediaStorage(config: MediaStorageConfig): MediaStorage {
  return config.provider === 'local'
    ? createLocalMediaStorage(config)
    : createS3MediaStorage(config);
}

export function parseMediaStorageConfig(env: NodeJS.ProcessEnv = process.env): MediaStorageConfig {
  const parsedBase = baseEnvSchema.parse(env);

  if (parsedBase.MEDIA_STORAGE_PROVIDER === 'local') {
    return {
      provider: 'local',
      maxUploadSizeBytes: parsedBase.MEDIA_UPLOAD_MAX_BYTES,
      keyPrefix: parsedBase.MEDIA_STORAGE_KEY_PREFIX,
      localBasePath: parsedBase.MEDIA_STORAGE_LOCAL_BASE_PATH,
      publicBaseUrl: parsedBase.MEDIA_STORAGE_PUBLIC_BASE_URL
    };
  }

  const requiredFields = [
    'MEDIA_STORAGE_S3_BUCKET',
    'MEDIA_STORAGE_S3_REGION',
    'MEDIA_STORAGE_S3_ACCESS_KEY_ID',
    'MEDIA_STORAGE_S3_SECRET_ACCESS_KEY'
  ] as const;
  const missingFields = requiredFields.filter((field) => !env[field]?.trim());

  if (missingFields.length > 0) {
    throw new Error(`Missing required S3 media storage settings: ${missingFields.join(', ')}`);
  }

  const s3EnvSchema = z.object({
    MEDIA_STORAGE_S3_BUCKET: z.string().trim().min(1),
    MEDIA_STORAGE_S3_REGION: z.string().trim().min(1),
    MEDIA_STORAGE_S3_ENDPOINT: z.string().trim().url().optional(),
    MEDIA_STORAGE_S3_ACCESS_KEY_ID: z.string().trim().min(1),
    MEDIA_STORAGE_S3_SECRET_ACCESS_KEY: z.string().trim().min(1),
    MEDIA_STORAGE_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false)
  });
  const parsedS3 = s3EnvSchema.parse(env);

  return {
    provider: 's3',
    maxUploadSizeBytes: parsedBase.MEDIA_UPLOAD_MAX_BYTES,
    keyPrefix: parsedBase.MEDIA_STORAGE_KEY_PREFIX,
    publicBaseUrl: parsedBase.MEDIA_STORAGE_PUBLIC_BASE_URL,
    bucket: parsedS3.MEDIA_STORAGE_S3_BUCKET,
    region: parsedS3.MEDIA_STORAGE_S3_REGION,
    endpoint: parsedS3.MEDIA_STORAGE_S3_ENDPOINT ?? null,
    accessKeyId: parsedS3.MEDIA_STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: parsedS3.MEDIA_STORAGE_S3_SECRET_ACCESS_KEY,
    forcePathStyle: parsedS3.MEDIA_STORAGE_S3_FORCE_PATH_STYLE
  };
}
