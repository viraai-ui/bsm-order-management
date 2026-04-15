import multer from 'multer';
import { z } from 'zod';
import type { MachineUnitApiRecord, MediaKind } from '../lib/dispatch.js';
import type { MediaStorage } from '../lib/mediaStorage.js';
import type { CreateMediaRecordInput, DispatchRepository } from '../repositories/dispatchRepository.js';

const mediaKindSchema = z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']);

const allowedMimeTypes: Record<MediaKind, string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm'],
  DOCUMENT: ['application/pdf'],
};

export class MediaUploadError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

export type UploadMachineUnitMediaInput = {
  machineUnitId: string;
  file?: Express.Multer.File;
  kind: string;
};

export function createMediaUploadMiddleware(maxUploadSizeBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxUploadSizeBytes,
    },
  }).single('file');
}

function parseMediaKind(kind: string): MediaKind {
  const parsed = mediaKindSchema.safeParse(kind);
  if (!parsed.success) {
    throw new MediaUploadError('Invalid media kind');
  }

  return parsed.data;
}

function validateFile(kind: MediaKind, file?: Express.Multer.File) {
  if (!file) {
    throw new MediaUploadError('A file upload is required');
  }

  if (file.size <= 0) {
    throw new MediaUploadError('Uploaded file is empty');
  }

  if (!allowedMimeTypes[kind].includes(file.mimetype)) {
    throw new MediaUploadError(`Unsupported ${kind.toLowerCase()} file type: ${file.mimetype}`);
  }

  return file;
}

export class MediaUploadService {
  constructor(
    private readonly dispatchRepository: DispatchRepository,
    private readonly mediaStorage: MediaStorage,
  ) {}

  async uploadMachineUnitMedia(input: UploadMachineUnitMediaInput): Promise<MachineUnitApiRecord | null> {
    const kind = parseMediaKind(input.kind);
    const file = validateFile(kind, input.file);

    const machineUnit = await this.dispatchRepository.getMachineUnitById(input.machineUnitId);
    if (!machineUnit) {
      return null;
    }

    const storedFile = await this.mediaStorage.saveUpload({
      machineUnitId: input.machineUnitId,
      mediaKind: kind,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    try {
      return await this.dispatchRepository.createMediaRecord({
        machineUnitId: input.machineUnitId,
        kind,
        fileName: storedFile.originalFileName,
        mimeType: storedFile.mimeType,
        storagePath: storedFile.storagePath,
        publicUrl: storedFile.publicUrl,
        sizeBytes: storedFile.sizeBytes,
      });
    } catch (error) {
      await this.mediaStorage.deleteObject(storedFile.storagePath).catch(() => undefined);
      throw error;
    }
  }
}

export type DeleteMachineUnitMediaResult = {
  machineUnit: MachineUnitApiRecord | null;
  deleted: boolean;
};

export async function deleteMachineUnitMedia(
  dispatchRepository: DispatchRepository,
  mediaStorage: MediaStorage,
  mediaId: string,
): Promise<DeleteMachineUnitMediaResult> {
  const mediaFile = await dispatchRepository.getMediaFileById(mediaId);
  if (!mediaFile) {
    return { machineUnit: null, deleted: false };
  }

  await mediaStorage.deleteObject(mediaFile.storagePath);
  const machineUnit = await dispatchRepository.deleteMediaRecord(mediaId);

  return {
    machineUnit,
    deleted: true,
  };
}

export type PersistedMediaRecordInput = CreateMediaRecordInput;
