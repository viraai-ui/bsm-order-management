import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { MediaStorage, S3MediaStorageConfig, SaveUploadInput, SaveUploadResult } from '../lib/mediaStorage.js';

type S3LikeClient = Pick<S3Client, 'send'>;

function sanitizeFileName(fileName: string) {
  const trimmed = path.posix.basename(fileName).trim();
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'upload.bin';
}

function buildStoragePath(config: S3MediaStorageConfig, file: SaveUploadInput) {
  const extension = path.posix.extname(file.originalFileName) || '';
  const baseName = path.posix.basename(sanitizeFileName(file.originalFileName), extension);
  const fileName = `${Date.now()}-${randomUUID()}-${baseName}${extension}`;

  return path.posix.join(config.keyPrefix, file.machineUnitId, file.mediaKind.toLowerCase(), fileName);
}

function buildEndpointPublicUrl(config: S3MediaStorageConfig, storagePath: string) {
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl}/${storagePath}`;
  }

  if (config.endpoint) {
    const endpoint = config.endpoint.replace(/\/+$/g, '');
    return config.forcePathStyle
      ? `${endpoint}/${config.bucket}/${storagePath}`
      : `${endpoint}/${storagePath}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${storagePath}`;
}

export function createS3MediaStorage(config: S3MediaStorageConfig, client?: S3LikeClient): MediaStorage {
  const s3Client = client ?? new S3Client({
    region: config.region,
    endpoint: config.endpoint ?? undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async saveUpload(file): Promise<SaveUploadResult> {
      const storagePath = buildStoragePath(config, file);

      await s3Client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: storagePath,
        Body: file.buffer,
        ContentType: file.mimeType,
      }));

      return {
        storagePath,
        publicUrl: buildEndpointPublicUrl(config, storagePath),
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.byteLength,
      };
    },

    async deleteObject(storagePath) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: storagePath,
      }));
    },

    buildPublicUrl(storagePath) {
      return buildEndpointPublicUrl(config, storagePath);
    },
  };
}
