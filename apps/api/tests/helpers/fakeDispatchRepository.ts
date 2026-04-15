import type { TeamAssignment } from '@prisma/client';
import type { MachineUnitApiRecord, WorkflowStage } from '../../src/lib/dispatch.js';
import type {
  DispatchOrdersByTeamApiRecord,
  OrderApiRecord,
  OrderDetailApiRecord,
} from '../../src/lib/orders.js';
import type { NormalizedOrder } from '../../src/lib/zoho.js';
import type {
  CreateMediaRecordInput,
  DispatchRepository,
  ReconcileZohoOrderResult,
} from '../../src/repositories/dispatchRepository.js';
import { getNextTeamAssignment } from '../../src/lib/orders.js';
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
      publicUrl: null,
      sizeBytes: 1024,
      createdAt: new Date(Date.UTC(2026, 3, 13, 8, index, 0)).toISOString(),
    })),
    ...Array.from({ length: videos }, (_, index) => ({
      id: `${machineUnitId}-video-${index + 1}`,
      machineUnitId,
      kind: 'VIDEO' as const,
      fileName: `${machineUnitId}-video-${index + 1}.mp4`,
      storagePath: `seed/${machineUnitId}/video-${index + 1}.mp4`,
      mimeType: 'video/mp4',
      publicUrl: null,
      sizeBytes: 4096,
      createdAt: new Date(Date.UTC(2026, 3, 13, 9, index, 0)).toISOString(),
    })),
  ];
}

type FakeOrderRecord = {
  id: string;
  salesOrderNumber: string;
  externalRef: string | null;
  customerName: string;
  customerEmail: string | null;
  deliveryDate: string | null;
  destination: string;
  status: string;
  notes: string | null;
  teamAssignment: TeamAssignment | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  machineUnits: MachineUnitApiRecord[];
};

const orders = new Map<string, FakeOrderRecord>([
  [
    'BSM-24018',
    {
      id: 'BSM-24018',
      salesOrderNumber: 'BSM-24018',
      externalRef: null,
      customerName: 'Anand Cooling Towers',
      customerEmail: null,
      deliveryDate: '2026-04-13T08:30:00.000Z',
      destination: 'Delhi NCR',
      status: 'Awaiting media',
      notes: null,
      teamAssignment: 'TEAM_A',
      assignedAt: '2026-04-13T07:00:00.000Z',
      createdAt: '2026-04-13T06:55:00.000Z',
      updatedAt: '2026-04-13T07:00:00.000Z',
      machineUnits: [
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
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: buildMediaFiles('MU-24018-1', 4, 0),
        },
      ],
    },
  ],
  [
    'BSM-24021',
    {
      id: 'BSM-24021',
      salesOrderNumber: 'BSM-24021',
      externalRef: null,
      customerName: 'Shiv Pumps',
      customerEmail: null,
      deliveryDate: '2026-04-13T13:00:00.000Z',
      destination: 'Jaipur',
      status: 'Dispatch ready',
      notes: null,
      teamAssignment: 'TEAM_B',
      assignedAt: '2026-04-13T07:05:00.000Z',
      createdAt: '2026-04-13T07:00:00.000Z',
      updatedAt: '2026-04-13T07:05:00.000Z',
      machineUnits: [
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
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: buildMediaFiles('MU-24021-1', 6, 2),
        },
      ],
    },
  ],
  [
    'BSM-24025',
    {
      id: 'BSM-24025',
      salesOrderNumber: 'BSM-24025',
      externalRef: null,
      customerName: 'Northline Infra',
      customerEmail: null,
      deliveryDate: '2026-04-14T10:00:00.000Z',
      destination: 'Lucknow',
      status: 'Testing complete',
      notes: null,
      teamAssignment: 'TEAM_A',
      assignedAt: '2026-04-13T07:10:00.000Z',
      createdAt: '2026-04-13T07:05:00.000Z',
      updatedAt: '2026-04-13T07:10:00.000Z',
      machineUnits: [
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
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: buildMediaFiles('MU-24025-1', 5, 2),
        },
      ],
    },
  ],
  [
    'BSM-24029',
    {
      id: 'BSM-24029',
      salesOrderNumber: 'BSM-24029',
      externalRef: null,
      customerName: 'Hydrotech Systems',
      customerEmail: null,
      deliveryDate: '2026-04-16T09:00:00.000Z',
      destination: 'Chandigarh',
      status: 'Testing complete',
      notes: null,
      teamAssignment: 'TEAM_B',
      assignedAt: '2026-04-13T07:15:00.000Z',
      createdAt: '2026-04-13T07:10:00.000Z',
      updatedAt: '2026-04-13T07:15:00.000Z',
      machineUnits: [
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
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: buildMediaFiles('MU-24029-1', 3, 1),
        },
      ],
    },
  ],
]);

function cloneMachineUnit(machineUnit: MachineUnitApiRecord): MachineUnitApiRecord {
  return {
    ...machineUnit,
    mediaFiles: machineUnit.mediaFiles.map((file) => ({ ...file })),
  };
}

function cloneOrder(order: FakeOrderRecord): FakeOrderRecord {
  return {
    ...order,
    machineUnits: order.machineUnits.map(cloneMachineUnit),
  };
}

function summarizeOrder(order: FakeOrderRecord): OrderApiRecord {
  return {
    id: order.id,
    salesOrderNumber: order.salesOrderNumber,
    externalRef: order.externalRef,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    deliveryDate: order.deliveryDate,
    destination: order.destination,
    status: order.status,
    teamAssignment: order.teamAssignment,
    assignedAt: order.assignedAt,
    machineUnitCount: order.machineUnits.length,
    totalQuantity: order.machineUnits.length,
    imageCount: order.machineUnits.reduce((sum, machineUnit) => sum + machineUnit.imageCount, 0),
    videoCount: order.machineUnits.reduce((sum, machineUnit) => sum + machineUnit.videoCount, 0),
    requiredVideoCount: order.machineUnits.reduce((sum, machineUnit) => sum + machineUnit.requiredVideoCount, 0),
    serialNumberCount: order.machineUnits.filter((machineUnit) => machineUnit.serialNumber).length,
    qrCodeCount: order.machineUnits.filter((machineUnit) => machineUnit.qrCodeValue).length,
    machineUnits: order.machineUnits.map((machineUnit) => ({
      id: machineUnit.id,
      zohoLineItemId: machineUnit.id,
      productName: machineUnit.productName,
      quantity: 1,
      sku: null,
      serialNumberCount: machineUnit.serialNumber ? 1 : 0,
      qrCodeCount: machineUnit.qrCodeValue ? 1 : 0,
      imageCount: machineUnit.imageCount,
      videoCount: machineUnit.videoCount,
      workflowStage: machineUnit.workflowStage,
    })),
  };
}

function detailOrder(order: FakeOrderRecord): OrderDetailApiRecord {
  const machineUnits = order.machineUnits.map(cloneMachineUnit);

  return {
    id: order.id,
    salesOrderNumber: order.salesOrderNumber,
    externalRef: order.externalRef,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    deliveryDate: order.deliveryDate,
    destination: order.destination,
    status: order.status,
    notes: order.notes,
    teamAssignment: order.teamAssignment,
    assignedAt: order.assignedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    machineUnitCount: machineUnits.length,
    imageCount: machineUnits.reduce((sum, machineUnit) => sum + machineUnit.imageCount, 0),
    videoCount: machineUnits.reduce((sum, machineUnit) => sum + machineUnit.videoCount, 0),
    requiredVideoCount: machineUnits.reduce((sum, machineUnit) => sum + machineUnit.requiredVideoCount, 0),
    serialNumberCount: machineUnits.filter((machineUnit) => machineUnit.serialNumber).length,
    qrCodeCount: machineUnits.filter((machineUnit) => machineUnit.qrCodeValue).length,
    workflowSummary: {
      awaitingMediaCount: machineUnits.filter((machineUnit) => machineUnit.workflowStage === 'PACKING_TESTING').length,
      mediaUploadedCount: machineUnits.filter((machineUnit) => machineUnit.workflowStage === 'MEDIA_UPLOADED').length,
      readyForDispatchCount: machineUnits.filter((machineUnit) => machineUnit.workflowStage === 'READY_FOR_DISPATCH').length,
      dispatchedCount: machineUnits.filter((machineUnit) => machineUnit.workflowStage === 'DISPATCHED').length,
    },
    machineUnits,
  };
}

export function createFakeDispatchRepository(): DispatchRepository {
  const orderData = new Map(Array.from(orders.entries(), ([id, order]) => [id, cloneOrder(order)]));
  let mediaSequence = 1;
  let orderSequence = 1;

  const getAllOrders = () => Array.from(orderData.values()).sort((left, right) => (left.deliveryDate ?? '').localeCompare(right.deliveryDate ?? ''));
  const getMachineUnit = (id: string) => getAllOrders().flatMap((order) => order.machineUnits).find((machineUnit) => machineUnit.id === id);
  const getOrderByMachineUnit = (id: string) => getAllOrders().find((order) => order.machineUnits.some((machineUnit) => machineUnit.id === id));

  const listDispatchOrders = async (): Promise<DispatchOrdersByTeamApiRecord> => ({
    TEAM_A: getAllOrders().filter((order) => order.teamAssignment === 'TEAM_A').map(summarizeOrder),
    TEAM_B: getAllOrders().filter((order) => order.teamAssignment === 'TEAM_B').map(summarizeOrder),
  });

  return {
    async listOrders(input) {
      return getAllOrders()
        .filter((order) => !input?.teamAssignment || order.teamAssignment === input.teamAssignment)
        .map(summarizeOrder);
    },
    listDispatchOrders,
    async getOrderById(id) {
      const order = orderData.get(id);
      return order ? detailOrder(order) : null;
    },
    async updateOrderTeamAssignment({ id, teamAssignment }) {
      const order = orderData.get(id);
      if (!order) return null;
      order.teamAssignment = teamAssignment;
      order.assignedAt = '2026-04-15T12:00:00.000Z';
      order.updatedAt = '2026-04-15T12:00:00.000Z';
      return detailOrder(order);
    },
    async generateOrderQrs(id) {
      const order = orderData.get(id);
      if (!order) return null;

      for (const machineUnit of order.machineUnits) {
        if (!machineUnit.serialNumber) {
          const prefix = getFinancialYearCode(new Date('2026-04-13T00:00:00Z'));
          const lastSequence = getAllOrders()
            .flatMap((currentOrder) => currentOrder.machineUnits)
            .reduce((max, item) => {
              const value = item.serialNumber?.startsWith(prefix) ? Number.parseInt(item.serialNumber.slice(4), 10) : 0;
              return Number.isFinite(value) ? Math.max(max, value) : max;
            }, 0);
          machineUnit.serialNumber = nextSerialNumber({ date: new Date('2026-04-13T00:00:00Z'), lastSequence }).serialNumber;
        }
        machineUnit.qrCodeValue = machineUnit.serialNumber ? `qr://${machineUnit.serialNumber}` : null;
      }

      order.updatedAt = '2026-04-15T12:05:00.000Z';
      return detailOrder(order);
    },
    async reconcileZohoOrder(input: NormalizedOrder): Promise<ReconcileZohoOrderResult> {
      const existingOrder = Array.from(orderData.values()).find((order) => order.externalRef === input.zohoSalesOrderId);
      const assignedOrderCount = getAllOrders().filter((order) => order.assignedAt).length;
      const order = existingOrder ?? {
        id: input.salesOrderNumber,
        salesOrderNumber: input.salesOrderNumber,
        externalRef: input.zohoSalesOrderId,
        customerName: input.customerName,
        customerEmail: null,
        deliveryDate: `${input.deliveryDate ?? input.orderDate}T00:00:00.000Z`,
        destination: 'Factory dispatch lane',
        status: 'Awaiting media',
        notes: null,
        teamAssignment: getNextTeamAssignment(assignedOrderCount),
        assignedAt: `2026-04-15T12:${String(orderSequence).padStart(2, '0')}:00.000Z`,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
        machineUnits: [],
      };

      order.externalRef = input.zohoSalesOrderId;
      order.customerName = input.customerName;
      order.deliveryDate = `${input.deliveryDate ?? input.orderDate}T00:00:00.000Z`;
      order.status = 'Awaiting media';
      order.updatedAt = '2026-04-15T12:10:00.000Z';
      order.machineUnits = input.machineUnits.flatMap((machineUnit, index) =>
        Array.from({ length: machineUnit.quantity }, (_, unitIndex) => ({
          id: `${input.salesOrderNumber}-${index + 1}-${unitIndex + 1}`,
          orderId: input.salesOrderNumber,
          orderNumber: input.salesOrderNumber,
          customerName: input.customerName,
          destination: 'Factory dispatch lane',
          scheduledFor: `${input.deliveryDate ?? input.orderDate}T00:00:00.000Z`,
          productName: machineUnit.productName,
          serialNumber: null,
          qrCodeValue: null,
          imageCount: 0,
          videoCount: 0,
          requiredVideoCount: 2,
          workflowStage: 'PACKING_TESTING',
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: [],
        }))
      );

      orderData.set(order.id, order);
      orderSequence += 1;

      return {
        order: summarizeOrder(order),
        deletedMachineUnitIds: [],
      };
    },
    async getMachineUnitById(id) {
      const machineUnit = getMachineUnit(id);
      return machineUnit ? cloneMachineUnit(machineUnit) : null;
    },
    async generateSerialNumber(id, date = new Date('2026-04-13T00:00:00Z')) {
      const machineUnit = getMachineUnit(id);
      if (!machineUnit) return null;
      if (!machineUnit.serialNumber) {
        const prefix = getFinancialYearCode(date);
        const lastSequence = getAllOrders().flatMap((order) => order.machineUnits).reduce((max, item) => {
          const value = item.serialNumber?.startsWith(prefix) ? Number.parseInt(item.serialNumber.slice(4), 10) : 0;
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0);
        machineUnit.serialNumber = nextSerialNumber({ date, lastSequence }).serialNumber;
      }
      return cloneMachineUnit(machineUnit);
    },
    async generateQrCode(id) {
      const machineUnit = getMachineUnit(id);
      if (!machineUnit) return null;
      if (machineUnit.serialNumber) {
        machineUnit.qrCodeValue = `qr://${machineUnit.serialNumber}`;
      }
      return cloneMachineUnit(machineUnit);
    },
    async updateMachineUnitWorkflowStage({ id, workflowStage }: { id: string; workflowStage: WorkflowStage }) {
      const machineUnit = getMachineUnit(id);
      if (!machineUnit) return null;
      machineUnit.workflowStage = workflowStage;
      return cloneMachineUnit(machineUnit);
    },
    async completeMachineUnitDispatch({ id, dispatchedAt = new Date('2026-04-15T11:30:00.000Z'), dispatchNotes = null }) {
      const machineUnit = getMachineUnit(id);
      if (!machineUnit) return null;
      machineUnit.workflowStage = 'DISPATCHED';
      machineUnit.dispatchedAt = dispatchedAt.toISOString();
      machineUnit.dispatchNotes = dispatchNotes;
      return cloneMachineUnit(machineUnit);
    },
    async getMediaFileById(id) {
      for (const order of orderData.values()) {
        for (const machineUnit of order.machineUnits) {
          const mediaFile = machineUnit.mediaFiles.find((file) => file.id === id);
          if (mediaFile) {
            return { ...mediaFile };
          }
        }
      }

      return null;
    },
    async createMediaRecord(input: CreateMediaRecordInput) {
      const machineUnit = getMachineUnit(input.machineUnitId);
      if (!machineUnit) return null;

      const record = {
        id: `media-${mediaSequence++}`,
        machineUnitId: input.machineUnitId,
        kind: input.kind,
        fileName: input.fileName,
        storagePath: input.storagePath,
        mimeType: input.mimeType ?? null,
        publicUrl: input.publicUrl ?? null,
        sizeBytes: input.sizeBytes ?? null,
        createdAt: new Date('2026-04-13T10:54:00.000Z').toISOString(),
      };

      machineUnit.mediaFiles = [...machineUnit.mediaFiles, record];
      if (input.kind === 'IMAGE') machineUnit.imageCount += 1;
      if (input.kind === 'VIDEO') machineUnit.videoCount += 1;
      return cloneMachineUnit(machineUnit);
    },
    async deleteMediaRecord(id) {
      for (const order of orderData.values()) {
        for (const machineUnit of order.machineUnits) {
          const deleted = machineUnit.mediaFiles.find((file) => file.id === id);
          if (!deleted) continue;

          machineUnit.mediaFiles = machineUnit.mediaFiles.filter((file) => file.id !== id);
          if (deleted.kind === 'IMAGE') machineUnit.imageCount = Math.max(machineUnit.imageCount - 1, 0);
          if (deleted.kind === 'VIDEO') machineUnit.videoCount = Math.max(machineUnit.videoCount - 1, 0);
          return cloneMachineUnit(machineUnit);
        }
      }

      return null;
    },
  };
}
