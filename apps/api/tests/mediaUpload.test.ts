import request from 'supertest';
import { createApp } from '../src/app.js';
import type { MediaStorage, SaveUploadInput, SaveUploadResult } from '../src/lib/mediaStorage.js';
import { createFakeDispatchRepository } from './helpers/fakeDispatchRepository.js';

function createFakeMediaStorage(overrides?: Partial<MediaStorage>): MediaStorage & { savedUploads: SaveUploadInput[]; deletedPaths: string[] } {
  const savedUploads: SaveUploadInput[] = [];
  const deletedPaths: string[] = [];

  return {
    savedUploads,
    deletedPaths,
    async saveUpload(file: SaveUploadInput): Promise<SaveUploadResult> {
      savedUploads.push(file);
      return {
        storagePath: `stored/${file.machineUnitId}/${file.originalFileName}`,
        publicUrl: `https://cdn.example.com/${file.machineUnitId}/${file.originalFileName}`,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.byteLength,
      };
    },
    async deleteObject(storagePath: string) {
      deletedPaths.push(storagePath);
    },
    buildPublicUrl(storagePath: string) {
      return `https://cdn.example.com/${storagePath}`;
    },
    ...overrides,
  };
}

describe('media upload routes', () => {
  it('uploads multipart media, stores it, and returns updated machine-unit detail', async () => {
    const mediaStorage = createFakeMediaStorage();
    const app = createApp({
      dispatchRepository: createFakeDispatchRepository(),
      mediaStorageService: mediaStorage,
      mediaStorage: {
        provider: 'local',
        maxUploadSizeBytes: 2 * 1024 * 1024,
        keyPrefix: 'ignored',
        localBasePath: 'ignored',
        publicBaseUrl: null,
      },
    });

    const response = await request(app)
      .post('/machine-units/MU-24018-1/media/upload')
      .field('kind', 'VIDEO')
      .attach('file', Buffer.from('video-proof'), {
        filename: 'test-run.mp4',
        contentType: 'video/mp4',
      });

    expect(response.status).toBe(201);
    expect(mediaStorage.savedUploads).toHaveLength(1);
    expect(mediaStorage.savedUploads[0]).toMatchObject({
      machineUnitId: 'MU-24018-1',
      mediaKind: 'VIDEO',
      originalFileName: 'test-run.mp4',
      mimeType: 'video/mp4',
    });
    expect(response.body.data.videoCount).toBe(1);
    expect(response.body.data.mediaFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'VIDEO',
          fileName: 'test-run.mp4',
          storagePath: 'stored/MU-24018-1/test-run.mp4',
          publicUrl: 'https://cdn.example.com/MU-24018-1/test-run.mp4',
          sizeBytes: Buffer.byteLength('video-proof'),
        }),
      ]),
    );
  });

  it('rejects unsupported mime types before storage write', async () => {
    const mediaStorage = createFakeMediaStorage();
    const app = createApp({
      dispatchRepository: createFakeDispatchRepository(),
      mediaStorageService: mediaStorage,
    });

    const response = await request(app)
      .post('/machine-units/MU-24018-1/media/upload')
      .field('kind', 'IMAGE')
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/unsupported image file type/i);
    expect(mediaStorage.savedUploads).toHaveLength(0);
  });

  it('returns 413 when the multipart upload exceeds the configured size limit', async () => {
    const app = createApp({
      dispatchRepository: createFakeDispatchRepository(),
      mediaStorageService: createFakeMediaStorage(),
      mediaStorage: {
        provider: 'local',
        maxUploadSizeBytes: 4,
        keyPrefix: 'ignored',
        localBasePath: 'ignored',
        publicBaseUrl: null,
      },
    });

    const response = await request(app)
      .post('/machine-units/MU-24018-1/media/upload')
      .field('kind', 'VIDEO')
      .attach('file', Buffer.from('much-too-large'), {
        filename: 'test-run.mp4',
        contentType: 'video/mp4',
      });

    expect(response.status).toBe(413);
    expect(response.body.error).toMatch(/exceeds the maximum allowed size/i);
  });

  it('does not delete the database row when storage deletion fails', async () => {
    const mediaStorage = createFakeMediaStorage({
      async deleteObject() {
        throw new Error('s3 is unavailable');
      },
    });
    const app = createApp({
      dispatchRepository: createFakeDispatchRepository(),
      mediaStorageService: mediaStorage,
    });

    const response = await request(app).delete('/media/MU-24018-1-image-1');

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('Failed to delete media from storage');

    const machineUnit = await request(app).get('/machine-units/MU-24018-1');
    expect(machineUnit.body.data.imageCount).toBe(4);
  });
});
