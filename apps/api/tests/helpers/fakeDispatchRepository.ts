import type { MachineUnitApiRecord, OrderApiRecord, WorkflowStage } from '../../src/lib/dispatch.js';
import type { CreateMediaRecordInput, DispatchRepository } from '../../src/repositories/dispatchRepository.js';
import { getFinancialYearCode, nextSerialNumber } from '../../src/services/serials.js';

function buildMediaFiles(machineUnitId: string, images: number, videos: number) {
  return [
    ...Array.from({ length: images }, (_, index) => ({
      id: `${machineUnitId}-image-${index + 1}`,
      machineUnitId,
      kind: 'IMAGE' as const,
      fileName: `${machineUnitId}-photo-${index + 1}.jpg`,
      storagePath: `seed/${machineUnitId}/photo-${index + 1}.jpg`,
      mimeType: 'image/jpeg',
      createdAt: new Date(Date.UTC(2026, 3, 13, 8, index, 0)).toISOString(),
    })),
    ...Array.from({ length: videos }, (_, index) => ({
      id: `${machineUnitId}-video-${index + 1}`,
      machineUnitId,
      kind: 'VIDEO' as const,
      fileName: `${machineUnitId}-video-${index + 1}.mp4`,
      storagePath: `seed/${machineUnitId}/video-${index + 1}.mp4`,
      mimeType: 'video/mp4',
      createdAt: new Date(Date.UTC(2026, 3, 13, 9, index, 0)).toISOString(),
    })),
  ];
}

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
      workflowStage: 'PACKING_TESTING',
      mediaFiles: buildMediaFiles('MU-24018-1', 4, 0),
    },
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
      workflowStage: 'READY_FOR_DISPATCH',
      mediaFiles: buildMediaFiles('MU-24021-1', 6, 2),
    },
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
      workflowStage: 'MEDIA_UPLOADED',
      mediaFiles: buildMediaFiles('MU-24025-1', 5, 2),
    },
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
      workflowStage: 'MEDIA_UPLOADED',
      mediaFiles: buildMediaFiles('MU-24029-1', 3, 1),
    },
  ],
]);

function cloneMachineUnit(machineUnit: MachineUnitApiRecord): MachineUnitApiRecord {
  return {
    ...machineUnit,
    mediaFiles: machineUnit.mediaFiles.map((file) => ({ ...file })),
  };
}

export function createFakeDispatchRepository(): DispatchRepository {
  const data = new Map(Array.from(machineUnits.entries(), ([id, machineUnit]) => [id, cloneMachineUnit(machineUnit)]));
  let mediaSequence = 1;

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
        sku: null,
      },
    ],
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
    },
    async createMediaRecord(input: CreateMediaRecordInput) {
      const machineUnit = data.get(input.machineUnitId);
      if (!machineUnit) return null;

      const record = {
        id: `media-${mediaSequence++}`,
        machineUnitId: input.machineUnitId,
        kind: input.kind,
        fileName: input.fileName,
        storagePath: `uploads/${input.machineUnitId}/${input.fileName}`,
        mimeType: input.mimeType ?? null,
        createdAt: new Date('2026-04-13T10:54:00.000Z').toISOString(),
      };

      machineUnit.mediaFiles = [...machineUnit.mediaFiles, record];
      if (input.kind === 'IMAGE') machineUnit.imageCount += 1;
      if (input.kind === 'VIDEO') machineUnit.videoCount += 1;
      return cloneMachineUnit(machineUnit);
    },
    async deleteMediaRecord(id) {
      for (const machineUnit of data.values()) {
        const deleted = machineUnit.mediaFiles.find((file) => file.id === id);
        if (!deleted) continue;

        machineUnit.mediaFiles = machineUnit.mediaFiles.filter((file) => file.id !== id);
        if (deleted.kind === 'IMAGE') machineUnit.imageCount = Math.max(machineUnit.imageCount - 1, 0);
        if (deleted.kind === 'VIDEO') machineUnit.videoCount = Math.max(machineUnit.videoCount - 1, 0);
        return cloneMachineUnit(machineUnit);
      }

      return null;
    },
  };
}
