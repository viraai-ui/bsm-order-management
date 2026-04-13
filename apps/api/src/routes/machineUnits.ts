import { Router } from 'express';
import { z } from 'zod';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import type { WorkflowStage } from '../lib/dispatch.js';
import { evaluateWorkflowReadiness } from '../services/workflow.js';

const createMediaSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
  fileName: z.string().min(1),
  mimeType: z.string().min(1).optional(),
});

export function createMachineUnitsRouter(dispatchRepository: DispatchRepository) {
  const router = Router();

  function buildResponse(machineUnit: Awaited<ReturnType<DispatchRepository['getMachineUnitById']>> extends infer T ? NonNullable<T> : never) {
    const workflow = evaluateWorkflowReadiness({
      serialNumber: machineUnit.serialNumber,
      qrCodeValue: machineUnit.qrCodeValue,
      imageCount: machineUnit.imageCount,
      videoCount: machineUnit.videoCount,
      requiredVideoCount: machineUnit.requiredVideoCount
    });

    return {
      data: machineUnit,
      workflow
    };
  }

  router.get('/:id', async (request, response) => {
    const machineUnit = await dispatchRepository.getMachineUnitById(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    response.status(200).json(buildResponse(machineUnit));
  });

  router.post('/:id/generate-serial', async (request, response) => {
    const machineUnit = await dispatchRepository.generateSerialNumber(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    response.status(200).json(buildResponse(machineUnit));
  });

  router.post('/:id/generate-qr', async (request, response) => {
    const existing = await dispatchRepository.getMachineUnitById(request.params.id);

    if (!existing) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    if (!existing.serialNumber) {
      response.status(409).json({ error: 'Serial number must exist before generating a QR code' });
      return;
    }

    const machineUnit = await dispatchRepository.generateQrCode(request.params.id);
    response.status(200).json(buildResponse(machineUnit ?? existing));
  });

  router.post('/:id/media', async (request, response) => {
    const parsed = createMediaSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid media payload' });
      return;
    }

    const machineUnit = await dispatchRepository.createMediaRecord({
      machineUnitId: request.params.id,
      kind: parsed.data.kind,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
    });

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    response.status(201).json(buildResponse(machineUnit));
  });

  router.patch('/:id', async (request, response) => {
    const machineUnit = await dispatchRepository.getMachineUnitById(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    const requestedStage = request.body?.workflowStage as WorkflowStage | undefined;

    if (requestedStage === 'READY_FOR_DISPATCH') {
      const workflow = evaluateWorkflowReadiness({
        serialNumber: machineUnit.serialNumber,
        qrCodeValue: machineUnit.qrCodeValue,
        imageCount: machineUnit.imageCount,
        videoCount: machineUnit.videoCount,
        requiredVideoCount: machineUnit.requiredVideoCount
      });

      if (!workflow.dispatchReady) {
        response.status(409).json({
          error: 'Machine unit is not ready for dispatch',
          blockers: workflow.blockers
        });
        return;
      }
    }

    const updated = requestedStage
      ? await dispatchRepository.updateMachineUnitWorkflowStage({ id: request.params.id, workflowStage: requestedStage })
      : machineUnit;

    response.status(200).json(buildResponse(updated ?? machineUnit));
  });

  return router;
}
