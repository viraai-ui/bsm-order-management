import { Router } from 'express';
import { nextSerialNumber } from '../services/serials.js';
import { evaluateWorkflowReadiness, type WorkflowStage } from '../services/workflow.js';

type MachineUnitRecord = {
  id: string;
  orderId: string;
  productName: string;
  serialNumber: string | null;
  qrCodeValue: string | null;
  imageCount: number;
  videoCount: number;
  workflowStage: WorkflowStage;
};

function buildMachineUnits(): MachineUnitRecord[] {
  return [
    {
      id: 'MU-24018-1',
      orderId: 'BSM-24018',
      productName: 'Axial Fan Unit',
      serialNumber: null,
      qrCodeValue: null,
      imageCount: 4,
      videoCount: 0,
      workflowStage: 'PACKING_TESTING',
    },
    {
      id: 'MU-24021-1',
      orderId: 'BSM-24021',
      productName: 'Pressure Pump Assembly',
      serialNumber: '262700014',
      qrCodeValue: 'qr://262700014',
      imageCount: 6,
      videoCount: 2,
      workflowStage: 'MEDIA_UPLOADED',
    },
  ];
}

export function createMachineUnitsRouter() {
  const router = Router();
  const machineUnits = buildMachineUnits();

  function findMachineUnit(id: string) {
    return machineUnits.find((item) => item.id === id);
  }

  function buildResponse(machineUnit: MachineUnitRecord) {
    const workflow = evaluateWorkflowReadiness(machineUnit);

    return {
      data: {
        ...machineUnit,
        workflowStage: machineUnit.workflowStage,
      },
      workflow,
    };
  }

  router.get('/', (_request, response) => {
    response.status(200).json({ data: machineUnits });
  });

  router.get('/:id', (request, response) => {
    const machineUnit = findMachineUnit(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    response.status(200).json(buildResponse(machineUnit));
  });

  router.post('/:id/generate-serial', (request, response) => {
    const machineUnit = findMachineUnit(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    const { serialNumber } = nextSerialNumber({ date: new Date('2026-04-13T00:00:00Z'), lastSequence: 24 });
    machineUnit.serialNumber = serialNumber;

    response.status(200).json(buildResponse(machineUnit));
  });

  router.post('/:id/generate-qr', (request, response) => {
    const machineUnit = findMachineUnit(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    if (!machineUnit.serialNumber) {
      response.status(409).json({ error: 'Serial number must exist before generating a QR code' });
      return;
    }

    machineUnit.qrCodeValue = `qr://${machineUnit.serialNumber}`;

    response.status(200).json(buildResponse(machineUnit));
  });

  router.patch('/:id', (request, response) => {
    const machineUnit = findMachineUnit(request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    const requestedStage = request.body?.workflowStage as WorkflowStage | undefined;

    if (requestedStage === 'READY_FOR_DISPATCH') {
      const workflow = evaluateWorkflowReadiness(machineUnit);

      if (!workflow.dispatchReady) {
        response.status(409).json({
          error: 'Machine unit is not ready for dispatch',
          blockers: workflow.blockers,
        });
        return;
      }
    }

    if (requestedStage) {
      machineUnit.workflowStage = requestedStage;
    }

    response.status(200).json(buildResponse(machineUnit));
  });

  return router;
}
