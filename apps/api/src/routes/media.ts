import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import { evaluateWorkflowReadiness } from '../services/workflow.js';

export function createMediaRouter(dispatchRepository: DispatchRepository) {
  const router = Router();

  router.delete('/:id', async (request, response) => {
    const machineUnit = await dispatchRepository.deleteMediaRecord(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Media file not found' });
      return;
    }

    const workflow = evaluateWorkflowReadiness({
      serialNumber: machineUnit.serialNumber,
      qrCodeValue: machineUnit.qrCodeValue,
      imageCount: machineUnit.imageCount,
      videoCount: machineUnit.videoCount,
      requiredVideoCount: machineUnit.requiredVideoCount,
    });

    response.status(200).json({ data: machineUnit, workflow });
  });

  return router;
}
