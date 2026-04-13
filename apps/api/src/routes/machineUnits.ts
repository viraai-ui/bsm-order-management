import { Router } from 'express';
import { nextSerialNumber } from '../services/serials.js';
import { evaluateWorkflowReadiness } from '../services/workflow.js';

const machineUnits = [
  {
    id: 'MU-24018-1',
    orderId: 'BSM-24018',
    productName: 'Axial Fan Unit',
    serialNumber: null,
    qrCodeValue: null,
    imageCount: 4,
    videoCount: 0,
  },
  {
    id: 'MU-24021-1',
    orderId: 'BSM-24021',
    productName: 'Pressure Pump Assembly',
    serialNumber: '262700014',
    qrCodeValue: 'qr://262700014',
    imageCount: 6,
    videoCount: 2,
  },
];

export function createMachineUnitsRouter() {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({ data: machineUnits });
  });

  router.get('/:id', (request, response) => {
    const machineUnit = machineUnits.find((item) => item.id === request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    response.status(200).json({
      data: machineUnit,
      workflow: evaluateWorkflowReadiness(machineUnit),
    });
  });

  router.post('/:id/generate-serial', (request, response) => {
    const machineUnit = machineUnits.find((item) => item.id === request.params.id);

    if (!machineUnit) {
      response.status(404).json({ error: 'Machine unit not found' });
      return;
    }

    const { serialNumber } = nextSerialNumber({ date: new Date('2026-04-13T00:00:00Z'), lastSequence: 24 });
    machineUnit.serialNumber = serialNumber;
    machineUnit.qrCodeValue = `qr://${serialNumber}`;

    response.status(200).json({
      data: machineUnit,
      workflow: evaluateWorkflowReadiness(machineUnit),
    });
  });

  return router;
}
