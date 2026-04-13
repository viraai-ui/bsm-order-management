import { MachineUnitStatus, MediaKind, OrderStatus, Prisma, type PrismaClient } from '@prisma/client';
import { getFinancialYearCode, nextSerialNumber } from '../services/serials.js';
import type { MachineUnitApiRecord, OrderApiRecord, WorkflowStage } from '../lib/dispatch.js';

export type UpdateMachineUnitStageInput = {
  id: string;
  workflowStage: WorkflowStage;
};

export type CreateMediaRecordInput = {
  machineUnitId: string;
  kind: MediaKind;
  fileName: string;
  mimeType?: string | null;
};

export interface DispatchRepository {
  listOrders(): Promise<OrderApiRecord[]>;
  getMachineUnitById(id: string): Promise<MachineUnitApiRecord | null>;
  generateSerialNumber(id: string, date?: Date): Promise<MachineUnitApiRecord | null>;
  generateQrCode(id: string): Promise<MachineUnitApiRecord | null>;
  updateMachineUnitWorkflowStage(input: UpdateMachineUnitStageInput): Promise<MachineUnitApiRecord | null>;
  createMediaRecord(input: CreateMediaRecordInput): Promise<MachineUnitApiRecord | null>;
  deleteMediaRecord(id: string): Promise<MachineUnitApiRecord | null>;
}

type PrismaMachineUnitPayload = Prisma.MachineUnitGetPayload<{
  include: {
    mediaFiles: true;
    order: true;
  };
}>;

type PrismaOrderPayload = Prisma.OrderGetPayload<{
  include: {
    machineUnits: true;
  };
}>;

export const defaultSeedOrders = [
  {
    id: 'BSM-24018',
    customerName: 'Anand Cooling Towers',
    dueDate: new Date('2026-04-13T08:30:00Z'),
    destination: 'Delhi NCR',
    status: OrderStatus.PENDING,
    machineUnits: [
      {
        id: 'MU-24018-1',
        externalRef: 'line-1',
        name: 'Axial Fan Unit',
        sku: 'AFU-01',
        quantity: 1,
        serialNumber: null,
        qrCodeValue: null,
        workflowStage: 'PACKING_TESTING' as WorkflowStage,
        requiredVideoCount: 2,
        media: { images: 4, videos: 0 }
      }
    ]
  },
  {
    id: 'BSM-24021',
    customerName: 'Shiv Pumps',
    dueDate: new Date('2026-04-13T13:00:00Z'),
    destination: 'Jaipur',
    status: OrderStatus.IN_PRODUCTION,
    machineUnits: [
      {
        id: 'MU-24021-1',
        externalRef: 'line-2',
        name: 'Pressure Pump Assembly',
        sku: 'PPA-02',
        quantity: 1,
        serialNumber: '262700014',
        qrCodeValue: 'qr://262700014',
        workflowStage: 'READY_FOR_DISPATCH' as WorkflowStage,
        requiredVideoCount: 2,
        media: { images: 6, videos: 2 }
      }
    ]
  },
  {
    id: 'BSM-24025',
    customerName: 'Northline Infra',
    dueDate: new Date('2026-04-14T10:00:00Z'),
    destination: 'Lucknow',
    status: OrderStatus.PENDING,
    machineUnits: [
      {
        id: 'MU-24025-1',
        externalRef: 'line-3',
        name: 'Cooling Tower Frame',
        sku: 'CTF-03',
        quantity: 1,
        serialNumber: '262700019',
        qrCodeValue: null,
        workflowStage: 'MEDIA_UPLOADED' as WorkflowStage,
        requiredVideoCount: 2,
        media: { images: 5, videos: 2 }
      }
    ]
  },
  {
    id: 'BSM-24029',
    customerName: 'Hydrotech Systems',
    dueDate: new Date('2026-04-16T09:00:00Z'),
    destination: 'Chandigarh',
    status: OrderStatus.READY_FOR_DISPATCH,
    machineUnits: [
      {
        id: 'MU-24029-1',
        externalRef: 'line-4',
        name: 'Heat Exchange Module',
        sku: 'HEM-04',
        quantity: 1,
        serialNumber: '262700024',
        qrCodeValue: 'qr://262700024',
        workflowStage: 'MEDIA_UPLOADED' as WorkflowStage,
        requiredVideoCount: 2,
        media: { images: 3, videos: 1 }
      }
    ]
  }
] as const;

function toWorkflowStage(status: OrderStatus, machineWorkflowStage: WorkflowStage): string {
  if (machineWorkflowStage === 'READY_FOR_DISPATCH' || status === OrderStatus.READY_FOR_DISPATCH) {
    return 'Dispatch ready';
  }

  if (machineWorkflowStage === 'MEDIA_UPLOADED') {
    return 'Testing complete';
  }

  return 'Awaiting media';
}

function mapOrder(order: PrismaOrderPayload): OrderApiRecord {
  return {
    id: order.id,
    salesOrderNumber: order.id,
    customerName: order.customerName,
    deliveryDate: order.dueDate?.toISOString() ?? null,
    destination: order.destination,
    status: toWorkflowStage(order.status, (order.machineUnits[0]?.workflowStage as WorkflowStage | undefined) ?? 'PACKING_TESTING'),
    machineUnits: order.machineUnits.map((machineUnit) => ({
      id: machineUnit.id,
      zohoLineItemId: machineUnit.externalRef ?? machineUnit.id,
      productName: machineUnit.name,
      quantity: machineUnit.quantity,
      sku: machineUnit.sku
    }))
  };
}

function mapMachineUnit(machineUnit: PrismaMachineUnitPayload): MachineUnitApiRecord {
  const imageCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.IMAGE).length;
  const videoCount = machineUnit.mediaFiles.filter((file) => file.kind === MediaKind.VIDEO).length;

  return {
    id: machineUnit.id,
    orderId: machineUnit.orderId,
    orderNumber: machineUnit.order.id,
    customerName: machineUnit.order.customerName,
    destination: machineUnit.order.destination,
    scheduledFor: machineUnit.order.dueDate?.toISOString() ?? null,
    productName: machineUnit.name,
    serialNumber: machineUnit.serialNumber,
    qrCodeValue: machineUnit.qrCodeValue,
    imageCount,
    videoCount,
    requiredVideoCount: machineUnit.requiredVideoCount,
    workflowStage: machineUnit.workflowStage as WorkflowStage,
    mediaFiles: machineUnit.mediaFiles.map((file) => ({
      id: file.id,
      machineUnitId: file.machineUnitId ?? machineUnit.id,
      kind: file.kind,
      fileName: file.fileName,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      createdAt: file.createdAt.toISOString()
    }))
  };
}

export async function seedDispatchData(prismaClient: PrismaClient) {
  const orderCount = await prismaClient.order.count();
  if (orderCount > 0) return;

  await prismaClient.$transaction(
    defaultSeedOrders.map((order) => prismaClient.order.create({
      data: {
        id: order.id,
        customerName: order.customerName,
        dueDate: order.dueDate,
        destination: order.destination,
        status: order.status,
        machineUnits: {
          create: order.machineUnits.map((machineUnit) => ({
            id: machineUnit.id,
            externalRef: machineUnit.externalRef,
            name: machineUnit.name,
            sku: machineUnit.sku,
            quantity: machineUnit.quantity,
            serialNumber: machineUnit.serialNumber,
            qrCodeValue: machineUnit.qrCodeValue,
            workflowStage: machineUnit.workflowStage,
            status: machineUnit.workflowStage === 'READY_FOR_DISPATCH' ? MachineUnitStatus.READY : MachineUnitStatus.PENDING,
            requiredVideoCount: machineUnit.requiredVideoCount,
            mediaFiles: {
              create: [
                ...Array.from({ length: machineUnit.media.images }, (_, index) => ({
                  kind: MediaKind.IMAGE,
                  fileName: `${machineUnit.id}-photo-${index + 1}.jpg`,
                  storagePath: `seed/${machineUnit.id}/photo-${index + 1}.jpg`,
                  mimeType: 'image/jpeg'
                })),
                ...Array.from({ length: machineUnit.media.videos }, (_, index) => ({
                  kind: MediaKind.VIDEO,
                  fileName: `${machineUnit.id}-video-${index + 1}.mp4`,
                  storagePath: `seed/${machineUnit.id}/video-${index + 1}.mp4`,
                  mimeType: 'video/mp4'
                }))
              ]
            }
          }))
        }
      }
    })),
  );
}

export class PrismaDispatchRepository implements DispatchRepository {
  private seedPromise: Promise<void> | null = null;

  constructor(private readonly prismaClient: PrismaClient) {}

  async listOrders(): Promise<OrderApiRecord[]> {
    await this.ensureSeedData();
    const orders = await this.prismaClient.order.findMany({
      include: {
        machineUnits: {
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return orders.map(mapOrder);
  }

  async getMachineUnitById(id: string): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const machineUnit = await this.prismaClient.machineUnit.findUnique({
      where: { id },
      include: { mediaFiles: true, order: true }
    });

    return machineUnit ? mapMachineUnit(machineUnit) : null;
  }

  async generateSerialNumber(id: string, date = new Date('2026-04-13T00:00:00Z')): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const machineUnit = await this.prismaClient.machineUnit.findUnique({
      where: { id },
      include: { mediaFiles: true, order: true }
    });

    if (!machineUnit) return null;
    if (machineUnit.serialNumber) return mapMachineUnit(machineUnit);

    const yearPrefix = getFinancialYearCode(date);
    const existingSerials = await this.prismaClient.machineUnit.findMany({
      where: {
        serialNumber: {
          startsWith: yearPrefix
        }
      },
      select: {
        serialNumber: true
      }
    });
    const lastSequence = existingSerials.reduce((max, item) => {
      const value = item.serialNumber ? Number.parseInt(item.serialNumber.slice(4), 10) : 0;
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    const next = nextSerialNumber({ date, lastSequence });

    const updated = await this.prismaClient.machineUnit.update({
      where: { id },
      data: { serialNumber: next.serialNumber },
      include: { mediaFiles: true, order: true }
    });

    return mapMachineUnit(updated);
  }

  async generateQrCode(id: string): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const machineUnit = await this.prismaClient.machineUnit.findUnique({
      where: { id },
      include: { mediaFiles: true, order: true }
    });

    if (!machineUnit) return null;
    if (!machineUnit.serialNumber) return mapMachineUnit(machineUnit);

    const updated = await this.prismaClient.machineUnit.update({
      where: { id },
      data: { qrCodeValue: `qr://${machineUnit.serialNumber}` },
      include: { mediaFiles: true, order: true }
    });

    return mapMachineUnit(updated);
  }

  async updateMachineUnitWorkflowStage(input: UpdateMachineUnitStageInput): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const existing = await this.prismaClient.machineUnit.findUnique({ where: { id: input.id } });
    if (!existing) return null;

    const updated = await this.prismaClient.machineUnit.update({
      where: { id: input.id },
      data: { workflowStage: input.workflowStage, status: input.workflowStage === 'READY_FOR_DISPATCH' ? MachineUnitStatus.READY : existing.status },
      include: { mediaFiles: true, order: true }
    });

    return mapMachineUnit(updated);
  }

  async createMediaRecord(input: CreateMediaRecordInput): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const machineUnit = await this.prismaClient.machineUnit.findUnique({ where: { id: input.machineUnitId } });
    if (!machineUnit) return null;

    await this.prismaClient.mediaFile.create({
      data: {
        machineUnitId: input.machineUnitId,
        orderId: machineUnit.orderId,
        kind: input.kind,
        fileName: input.fileName,
        storagePath: `uploads/${input.machineUnitId}/${Date.now()}-${input.fileName}`,
        mimeType: input.mimeType ?? null
      }
    });

    return this.getMachineUnitById(input.machineUnitId);
  }

  async deleteMediaRecord(id: string): Promise<MachineUnitApiRecord | null> {
    await this.ensureSeedData();
    const mediaFile = await this.prismaClient.mediaFile.findUnique({ where: { id } });
    if (!mediaFile?.machineUnitId) return null;

    await this.prismaClient.mediaFile.delete({ where: { id } });
    return this.getMachineUnitById(mediaFile.machineUnitId);
  }

  private async ensureSeedData() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedIfEmpty();
    }

    await this.seedPromise;
  }

  private async seedIfEmpty() {
    await seedDispatchData(this.prismaClient);
  }
}
