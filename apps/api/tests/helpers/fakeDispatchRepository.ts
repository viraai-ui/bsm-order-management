import type { MachineUnitApiRecord, OrderApiRecord, WorkflowStage } from '../../src/lib/dispatch.js';
import type { DispatchRepository } from '../../src/repositories/dispatchRepository.js';
import { getFinancialYearCode, nextSerialNumber } from '../../src/services/serials.js';

const machineUnits = new Map<string, MachineUnitApiRecord>([
  [
    'MU-24018-1',
    {
      id: 'MU-24018-1',
      orderId: 'BSM-24018',
      orderNumber: 'BSM-24018',
      customerName: 'Anand Cooling Towers',
      destination: 'Delhi NCR',
      scheduledFor: '2026-04-13T08:30:00.000Z',
      productName: 'Axial Fan Unit',
      serialNumber: null,
      qrCodeValue: null,
      imageCount: 4,
      videoCount: 0,
      requiredVideoCount: 2,
      workflowStage: 'PACKING_TESTING'
    }
  ],
  [
    'MU-24021-1',
    {
      id: 'MU-24021-1',
      orderId: 'BSM-24021',
      orderNumber: 'BSM-24021',
      customerName: 'Shiv Pumps',
      destination: 'Jaipur',
      scheduledFor: '2026-04-13T13:00:00.000Z',
      productName: 'Pressure Pump Assembly',
      serialNumber: '262700014',
      qrCodeValue: 'qr://262700014',
      imageCount: 6,
      videoCount: 2,
      requiredVideoCount: 2,
      workflowStage: 'READY_FOR_DISPATCH'
    }
  ],
  [
    'MU-24025-1',
    {
      id: 'MU-24025-1',
      orderId: 'BSM-24025',
      orderNumber: 'BSM-24025',
      customerName: 'Northline Infra',
      destination: 'Lucknow',
      scheduledFor: '2026-04-14T10:00:00.000Z',
      productName: 'Cooling Tower Frame',
      serialNumber: '262700019',
      qrCodeValue: null,
      imageCount: 5,
      videoCount: 2,
      requiredVideoCount: 2,
      workflowStage: 'MEDIA_UPLOADED'
    }
  ],
  [
    'MU-24029-1',
    {
      id: 'MU-24029-1',
      orderId: 'BSM-24029',
      orderNumber: 'BSM-24029',
      customerName: 'Hydrotech Systems',
      destination: 'Chandigarh',
      scheduledFor: '2026-04-16T09:00:00.000Z',
      productName: 'Heat Exchange Module',
      serialNumber: '262700024',
      qrCodeValue: 'qr://262700024',
      imageCount: 3,
      videoCount: 1,
      requiredVideoCount: 2,
      workflowStage: 'MEDIA_UPLOADED'
    }
  ]
]);

function cloneMachineUnit(machineUnit: MachineUnitApiRecord): MachineUnitApiRecord {
  return { ...machineUnit };
}

export function createFakeDispatchRepository(): DispatchRepository {
  const data = new Map(Array.from(machineUnits.entries(), ([id, machineUnit]) => [id, cloneMachineUnit(machineUnit)]));

  const listOrders = async (): Promise<OrderApiRecord[]> => Array.from(data.values()).map((machineUnit) => ({
    id: machineUnit.orderId,
    salesOrderNumber: machineUnit.orderNumber,
    customerName: machineUnit.customerName,
    deliveryDate: machineUnit.scheduledFor,
    destination: machineUnit.destination,
    status: machineUnit.workflowStage === 'READY_FOR_DISPATCH' ? 'Dispatch ready' : machineUnit.videoCount >= machineUnit.requiredVideoCount ? 'Testing complete' : 'Awaiting media',
    machineUnits: [
      {
        id: machineUnit.id,
        zohoLineItemId: machineUnit.id,
        productName: machineUnit.productName,
        quantity: 1,
        sku: null
      }
    ]
  }));

  return {
    listOrders,
    async getMachineUnitById(id) {
      const machineUnit = data.get(id);
      return machineUnit ? cloneMachineUnit(machineUnit) : null;
    },
    async generateSerialNumber(id, date = new Date('2026-04-13T00:00:00Z')) {
      const machineUnit = data.get(id);
      if (!machineUnit) return null;
      if (!machineUnit.serialNumber) {
        const prefix = getFinancialYearCode(date);
        const lastSequence = Array.from(data.values()).reduce((max, item) => {
          const value = item.serialNumber?.startsWith(prefix) ? Number.parseInt(item.serialNumber.slice(4), 10) : 0;
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0);
        machineUnit.serialNumber = nextSerialNumber({ date, lastSequence }).serialNumber;
      }
      return cloneMachineUnit(machineUnit);
    },
    async generateQrCode(id) {
      const machineUnit = data.get(id);
      if (!machineUnit) return null;
      if (machineUnit.serialNumber) {
        machineUnit.qrCodeValue = `qr://${machineUnit.serialNumber}`;
      }
      return cloneMachineUnit(machineUnit);
    },
    async updateMachineUnitWorkflowStage({ id, workflowStage }: { id: string; workflowStage: WorkflowStage }) {
      const machineUnit = data.get(id);
      if (!machineUnit) return null;
      machineUnit.workflowStage = workflowStage;
      return cloneMachineUnit(machineUnit);
    }
  };
}
