import { MediaKind, type Prisma, type TeamAssignment } from '@prisma/client';
import type { MachineUnitApiRecord, WorkflowStage } from './dispatch.js';

export type OrderTeamAssignment = TeamAssignment;

export type OrderMachineSummaryApiRecord = {
  id: string;
  zohoLineItemId: string;
  productName: string;
  quantity: number;
  sku: string | null;
  serialNumberCount: number;
  qrCodeCount: number;
  imageCount: number;
  videoCount: number;
  workflowStage: WorkflowStage;
};

export type OrderApiRecord = {
  id: string;
  salesOrderNumber: string;
  externalRef: string | null;
  customerName: string;
  customerEmail: string | null;
  deliveryDate: string | null;
  destination: string;
  status: string;
  teamAssignment: OrderTeamAssignment | null;
  assignedAt: string | null;
  machineUnitCount: number;
  totalQuantity: number;
  imageCount: number;
  videoCount: number;
  requiredVideoCount: number;
  serialNumberCount: number;
  qrCodeCount: number;
  machineUnits: OrderMachineSummaryApiRecord[];
};

export type OrderDetailApiRecord = {
  id: string;
  salesOrderNumber: string;
  externalRef: string | null;
  customerName: string;
  customerEmail: string | null;
  deliveryDate: string | null;
  destination: string;
  status: string;
  notes: string | null;
  teamAssignment: OrderTeamAssignment | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  machineUnitCount: number;
  imageCount: number;
  videoCount: number;
  requiredVideoCount: number;
  serialNumberCount: number;
  qrCodeCount: number;
  workflowSummary: {
    awaitingMediaCount: number;
    mediaUploadedCount: number;
    readyForDispatchCount: number;
    dispatchedCount: number;
  };
  machineUnits: MachineUnitApiRecord[];
};

export type DispatchOrdersByTeamApiRecord = Record<OrderTeamAssignment, OrderApiRecord[]>;

type OrderListPayload = Prisma.OrderGetPayload<{
  include: {
    machineUnits: {
      include: {
        mediaFiles: {
          select: {
            kind: true;
          };
        };
      };
    };
  };
}>;

type OrderDetailPayload = Prisma.OrderGetPayload<{
  include: {
    machineUnits: {
      include: {
        mediaFiles: true;
      };
      orderBy: {
        id: 'asc';
      };
    };
  };
}>;

function toWorkflowStageLabel(status: string, machineWorkflowStage: WorkflowStage): string {
  if (machineWorkflowStage === 'DISPATCHED') {
    return 'Dispatched';
  }

  if (machineWorkflowStage === 'READY_FOR_DISPATCH' || status === 'READY_FOR_DISPATCH') {
    return 'Dispatch ready';
  }

  if (machineWorkflowStage === 'MEDIA_UPLOADED') {
    return 'Testing complete';
  }

  return 'Awaiting media';
}

function buildMachineUnitRecord(order: OrderDetailPayload, machineUnit: OrderDetailPayload['machineUnits'][number]): MachineUnitApiRecord {
  const imageCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.IMAGE).length;
  const videoCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.VIDEO).length;

  return {
    id: machineUnit.id,
    orderId: machineUnit.orderId,
    orderNumber: order.id,
    customerName: order.customerName,
    destination: order.destination,
    scheduledFor: order.dueDate?.toISOString() ?? null,
    productName: machineUnit.name,
    serialNumber: machineUnit.serialNumber,
    qrCodeValue: machineUnit.qrCodeValue,
    imageCount,
    videoCount,
    requiredVideoCount: machineUnit.requiredVideoCount,
    workflowStage: machineUnit.workflowStage as WorkflowStage,
    dispatchedAt: machineUnit.dispatchedAt?.toISOString() ?? null,
    dispatchNotes: machineUnit.dispatchNotes,
    mediaFiles: machineUnit.mediaFiles.map((file) => ({
      id: file.id,
      machineUnitId: file.machineUnitId ?? machineUnit.id,
      kind: file.kind,
      fileName: file.fileName,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      publicUrl: file.publicUrl,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString()
    }))
  };
}

export function mapOrderListRecord(order: OrderListPayload): OrderApiRecord {
  const machineUnits = order.machineUnits.map((machineUnit) => {
    const imageCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.IMAGE).length;
    const videoCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.VIDEO).length;

    return {
      id: machineUnit.id,
      zohoLineItemId: machineUnit.externalRef ?? machineUnit.id,
      productName: machineUnit.name,
      quantity: machineUnit.quantity,
      sku: machineUnit.sku ?? null,
      serialNumberCount: machineUnit.serialNumber ? 1 : 0,
      qrCodeCount: machineUnit.qrCodeValue ? 1 : 0,
      imageCount,
      videoCount,
      workflowStage: machineUnit.workflowStage as WorkflowStage
    };
  });

  const imageCount = machineUnits.reduce((sum, machineUnit) => sum + machineUnit.imageCount, 0);
  const videoCount = machineUnits.reduce((sum, machineUnit) => sum + machineUnit.videoCount, 0);
  const requiredVideoCount = order.machineUnits.reduce((sum, machineUnit) => sum + machineUnit.requiredVideoCount, 0);
  const serialNumberCount = order.machineUnits.filter((machineUnit) => machineUnit.serialNumber).length;
  const qrCodeCount = order.machineUnits.filter((machineUnit) => machineUnit.qrCodeValue).length;

  return {
    id: order.id,
    salesOrderNumber: order.id,
    externalRef: order.externalRef,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    deliveryDate: order.dueDate?.toISOString() ?? null,
    destination: order.destination,
    status: toWorkflowStageLabel(order.status, (order.machineUnits[0]?.workflowStage as WorkflowStage | undefined) ?? 'PACKING_TESTING'),
    teamAssignment: order.teamAssignment,
    assignedAt: order.assignedAt?.toISOString() ?? null,
    machineUnitCount: order.machineUnits.length,
    totalQuantity: order.machineUnits.reduce((sum, machineUnit) => sum + machineUnit.quantity, 0),
    imageCount,
    videoCount,
    requiredVideoCount,
    serialNumberCount,
    qrCodeCount,
    machineUnits
  };
}

export function mapOrderDetailRecord(order: OrderDetailPayload): OrderDetailApiRecord {
  const machineUnits = order.machineUnits.map((machineUnit) => buildMachineUnitRecord(order, machineUnit));

  return {
    id: order.id,
    salesOrderNumber: order.id,
    externalRef: order.externalRef,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    deliveryDate: order.dueDate?.toISOString() ?? null,
    destination: order.destination,
    status: toWorkflowStageLabel(order.status, (order.machineUnits[0]?.workflowStage as WorkflowStage | undefined) ?? 'PACKING_TESTING'),
    notes: order.notes,
    teamAssignment: order.teamAssignment,
    assignedAt: order.assignedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
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
    machineUnits
  };
}

export function getNextTeamAssignment(assignedOrderCount: number): OrderTeamAssignment {
  return assignedOrderCount % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
}
