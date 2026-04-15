import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LocalMediaStorageConfig, MediaStorage, SaveUploadInput, SaveUploadResult } from '../lib/mediaStorage.js';

function sanitizeFileName(fileName: string) {
  const trimmed = path.basename(fileName).trim();
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'upload.bin';
}

function buildStoragePath(config: LocalMediaStorageConfig, file: SaveUploadInput) {
  const extension = path.extname(file.originalFileName) || '';
  const baseName = path.basename(sanitizeFileName(file.originalFileName), extension);
  const fileName = `${Date.now()}-${randomUUID()}-${baseName}${extension}`;

  return path.posix.join(config.keyPrefix, file.machineUnitId, file.mediaKind.toLowerCase(), fileName);
}

function buildPublicUrl(baseUrl: string | null, storagePath: string) {
  return baseUrl ? `${baseUrl}/${storagePath}` : null;
}

export function createLocalMediaStorage(config: LocalMediaStorageConfig): MediaStorage {
  return {
    async saveUpload(file): Promise<SaveUploadResult> {
      const storagePath = buildStoragePath(config, file);
      const destinationPath = path.resolve(config.localBasePath, storagePath);

      await mkdir(path.dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, file.buffer);

      return {
        storagePath,
        publicUrl: buildPublicUrl(config.publicBaseUrl, storagePath),
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.byteLength,
      };
    },

    async deleteObject(storagePath) {
      const destinationPath = path.resolve(config.localBasePath, storagePath);

      try {
        await unlink(destinationPath);
      } catch (error) {
        const fileError = error as NodeJS.ErrnoException;
        if (fileError.code !== 'ENOENT') {
          throw error;
        }
      }
    },

    buildPublicUrl(storagePath) {
      return buildPublicUrl(config.publicBaseUrl, storagePath);
    },
  };
}
