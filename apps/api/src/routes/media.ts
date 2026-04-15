import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import type { MediaStorage } from '../lib/mediaStorage.js';
import { evaluateWorkflowReadiness } from '../services/workflow.js';
import { deleteMachineUnitMedia } from '../services/mediaUpload.js';

export function createMediaRouter(dispatchRepository: DispatchRepository, mediaStorage: MediaStorage) {
  const router = Router();

  router.delete('/:id', async (request, response) => {
    try {
      const result = await deleteMachineUnitMedia(dispatchRepository, mediaStorage, request.params.id);

      if (!result.deleted || !result.machineUnit) {
        response.status(404).json({ error: 'Media file not found' });
        return;
      }

      const workflow = evaluateWorkflowReadiness({
        serialNumber: result.machineUnit.serialNumber,
        qrCodeValue: result.machineUnit.qrCodeValue,
        imageCount: result.machineUnit.imageCount,
        videoCount: result.machineUnit.videoCount,
        requiredVideoCount: result.machineUnit.requiredVideoCount,
      });

      response.status(200).json({ data: result.machineUnit, workflow });
    } catch {
      response.status(502).json({ error: 'Failed to delete media from storage' });
    }
  });

  return router;
}
