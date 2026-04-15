import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import type { WorkflowStage } from '../lib/dispatch.js';
import type { MediaStorage } from '../lib/mediaStorage.js';
import { evaluateWorkflowReadiness } from '../services/workflow.js';
import { createMediaUploadMiddleware, MediaUploadError, MediaUploadService } from '../services/mediaUpload.js';

export function createMachineUnitsRouter(
  dispatchRepository: DispatchRepository,
  mediaStorage: MediaStorage,
  maxUploadSizeBytes = 25 * 1024 * 1024,
) {
  const router = Router();
  const uploadMiddleware = createMediaUploadMiddleware(maxUploadSizeBytes);
  const mediaUploadService = new MediaUploadService(dispatchRepository, mediaStorage);

  function buildResponse(machineUnit: Awaited<ReturnType<DispatchRepository['getMachineUnitById']>> extends infer T ? NonNullable<T> : never) {
    const workflow = evaluateWorkflowReadiness({
      serialNumber: machineUnit.serialNumber,
      qrCodeValue: machineUnit.qrCodeValue,
      imageCount: machineUnit.imageCount,
      videoCount: machineUnit.videoCount,
      requiredVideoCount: machineUnit.requiredVideoCount,
      workflowStage: machineUnit.workflowStage,
      dispatchedAt: machineUnit.dispatchedAt,
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

  router.post('/:id/media/upload', uploadMiddleware, async (request, response, next) => {
    try {
      const rawKind = request.body?.kind;
      const kind = typeof rawKind === 'string'
        ? rawKind
        : Array.isArray(rawKind)
          ? String(rawKind[0] ?? '')
          : '';

      const machineUnit = await mediaUploadService.uploadMachineUnitMedia({
        machineUnitId: String(request.params.id),
        kind,
        file: request.file,
      });

      if (!machineUnit) {
        response.status(404).json({ error: 'Machine unit not found' });
        return;
      }

      response.status(201).json(buildResponse(machineUnit));
    } catch (error) {
      if (error instanceof MediaUploadError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  router.post('/:id/dispatch', async (request, response) => {
    const machineUnit = await dispatchRepository.getMachineUnitById(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    if (machineUnit.workflowStage !== 'DISPATCHED') {
      const workflow = evaluateWorkflowReadiness({
        serialNumber: machineUnit.serialNumber,
        qrCodeValue: machineUnit.qrCodeValue,
        imageCount: machineUnit.imageCount,
        videoCount: machineUnit.videoCount,
        requiredVideoCount: machineUnit.requiredVideoCount,
      });

      if (!workflow.dispatchReady) {
        response.status(409).json({
          error: 'Machine unit is not ready for dispatch',
          blockers: workflow.blockers,
        });
        return;
      }
    }

    const rawNotes = request.body?.dispatchNotes;
    const dispatchNotes = typeof rawNotes === 'string' ? rawNotes.trim() || null : null;
    const updated = machineUnit.workflowStage === 'DISPATCHED'
      ? machineUnit
      : await dispatchRepository.completeMachineUnitDispatch({
          id: request.params.id,
          dispatchNotes,
        });

    response.status(200).json(buildResponse(updated ?? machineUnit));
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
        requiredVideoCount: machineUnit.requiredVideoCount,
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
