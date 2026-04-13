import { MachineUnitStatus, OrderStatus, Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaDispatchRepository } from '../src/repositories/dispatchRepository.js';
import type { NormalizedOrder } from '../src/lib/zoho.js';

describe('PrismaDispatchRepository Zoho reconciliation', () => {
  it('creates a new Zoho-backed order and one machine-unit row per requested quantity', async () => {
    const orderFindUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildOrderRecord({
        id: 'SO-0042',
        externalRef: 'zoho-so-42',
        customerName: 'Acme Hospitals',
        dueDate: new Date('2026-04-20T00:00:00.000Z'),
        status: OrderStatus.PENDING,
        machineUnits: [
          buildMachineUnit({ id: 'mu-1', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-2' }),
          buildMachineUnit({ id: 'mu-2', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-2' }),
          buildMachineUnit({ id: 'mu-3', orderId: 'SO-0042', externalRef: 'line-2', name: 'Control Panel', sku: null })
        ]
      }));

    const prisma = {
      order: {
        count: vi.fn().mockResolvedValue(1),
        findUnique: orderFindUnique,
        create: vi.fn().mockResolvedValue({ id: 'SO-0042', externalRef: 'zoho-so-42' }),
        update: vi.fn()
      },
      machineUnit: {
        createMany: vi.fn().mockResolvedValue({ count: 3 }),
        updateMany: vi.fn(),
        deleteMany: vi.fn()
      },
      syncLog: {
        create: vi.fn().mockResolvedValue({ id: 'sync-1' }),
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    };

    const repository = new PrismaDispatchRepository(prisma as never);

    const result = await repository.reconcileZohoOrder(buildNormalizedOrder());

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'SO-0042',
        externalRef: 'zoho-so-42',
        customerName: 'Acme Hospitals',
        dueDate: new Date('2026-04-20T00:00:00.000Z'),
        status: OrderStatus.PENDING
      })
    });
    expect(prisma.machineUnit.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-2', quantity: 1 }),
        expect.objectContaining({ orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-2', quantity: 1 }),
        expect.objectContaining({ orderId: 'SO-0042', externalRef: 'line-2', name: 'Control Panel', sku: null, quantity: 1 })
      ]
    });
    expect(prisma.syncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'order',
        entityId: 'SO-0042',
        orderId: 'SO-0042',
        provider: 'zoho_inventory',
        message: expect.stringContaining('Reconciled Zoho sales order SO-0042')
      })
    });
    expect(result.deletedMachineUnitIds).toEqual([]);
    expect(result.order.machineUnits).toEqual([
      expect.objectContaining({ zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 2, sku: 'AFU-2' }),
      expect.objectContaining({ zohoLineItemId: 'line-2', productName: 'Control Panel', quantity: 1, sku: null })
    ]);
  });

  it('deletes only the least-progressed excess units for the exact changed Zoho line item and logs each deletion', async () => {
    const existingOrder = buildOrderRecord({
      id: 'SO-0042',
      externalRef: 'zoho-so-42',
      customerName: 'Acme Hospitals',
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      status: OrderStatus.IN_PRODUCTION,
      machineUnits: [
        buildMachineUnit({ id: 'mu-pack', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-OLD', workflowStage: 'PACKING_TESTING', status: MachineUnitStatus.PENDING }),
        buildMachineUnit({ id: 'mu-media', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-OLD', workflowStage: 'MEDIA_UPLOADED', status: MachineUnitStatus.QA, serialNumber: '262700111' }),
        buildMachineUnit({ id: 'mu-ready', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit', sku: 'AFU-OLD', workflowStage: 'READY_FOR_DISPATCH', status: MachineUnitStatus.READY, serialNumber: '262700112', qrCodeValue: 'qr://262700112' }),
        buildMachineUnit({ id: 'mu-other-line', orderId: 'SO-0042', externalRef: 'line-2', name: 'Control Panel', workflowStage: 'PACKING_TESTING', status: MachineUnitStatus.ASSEMBLY })
      ]
    });

    const reconciledOrder = buildOrderRecord({
      ...existingOrder,
      customerName: 'Acme Hospitals Updated',
      machineUnits: [
        buildMachineUnit({ id: 'mu-media', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit v2', sku: 'AFU-2', workflowStage: 'MEDIA_UPLOADED', status: MachineUnitStatus.QA, serialNumber: '262700111' }),
        buildMachineUnit({ id: 'mu-ready', orderId: 'SO-0042', externalRef: 'line-1', name: 'Axial Fan Unit v2', sku: 'AFU-2', workflowStage: 'READY_FOR_DISPATCH', status: MachineUnitStatus.READY, serialNumber: '262700112', qrCodeValue: 'qr://262700112' }),
        buildMachineUnit({ id: 'mu-other-line', orderId: 'SO-0042', externalRef: 'line-2', name: 'Control Panel', workflowStage: 'PACKING_TESTING', status: MachineUnitStatus.ASSEMBLY })
      ]
    });

    const orderFindUnique = vi
      .fn()
      .mockResolvedValueOnce(existingOrder)
      .mockResolvedValueOnce(reconciledOrder);

    const prisma = {
      order: {
        count: vi.fn().mockResolvedValue(1),
        findUnique: orderFindUnique,
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'SO-0042', externalRef: 'zoho-so-42' })
      },
      machineUnit: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      syncLog: {
        create: vi.fn().mockResolvedValue({ id: 'sync-order' }),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };

    const repository = new PrismaDispatchRepository(prisma as never);

    const result = await repository.reconcileZohoOrder(
      buildNormalizedOrder({
        customerName: 'Acme Hospitals Updated',
        machineUnits: [
          {
            zohoLineItemId: 'line-1',
            productName: 'Axial Fan Unit v2',
            sku: 'AFU-2',
            quantity: 2,
            productImageUrl: 'https://example.com/afu.png'
          }
        ]
      })
    );

    expect(prisma.machineUnit.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['mu-ready', 'mu-media'] } },
      data: { externalRef: 'line-1', name: 'Axial Fan Unit v2', sku: 'AFU-2', quantity: 1 }
    });
    expect(prisma.machineUnit.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['mu-pack'] } }
    });
    expect(prisma.syncLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          entityType: 'machine_unit',
          entityId: 'mu-pack',
          orderId: 'SO-0042',
          provider: 'zoho_inventory',
          message: expect.stringContaining('Deleted machine unit mu-pack')
        })
      ]
    });
    expect(result.deletedMachineUnitIds).toEqual(['mu-pack']);
    expect(result.order.customerName).toBe('Acme Hospitals Updated');
    expect(result.order.machineUnits).toEqual([
      expect.objectContaining({ zohoLineItemId: 'line-1', productName: 'Axial Fan Unit v2', quantity: 2, sku: 'AFU-2' }),
      expect.objectContaining({ zohoLineItemId: 'line-2', productName: 'Control Panel', quantity: 1 })
    ]);
  });
});

function buildNormalizedOrder(overrides: Partial<NormalizedOrder> = {}): NormalizedOrder {
  return {
    zohoSalesOrderId: 'zoho-so-42',
    salesOrderNumber: 'SO-0042',
    orderDate: '2026-04-13',
    deliveryDate: '2026-04-20',
    customerName: 'Acme Hospitals',
    status: 'confirmed',
    machineUnits: [
      {
        zohoLineItemId: 'line-1',
        productName: 'Axial Fan Unit',
        sku: 'AFU-2',
        quantity: 2,
        productImageUrl: 'https://example.com/afu.png'
      },
      {
        zohoLineItemId: 'line-2',
        productName: 'Control Panel',
        sku: undefined,
        quantity: 1,
        productImageUrl: undefined
      }
    ],
    ...overrides
  };
}

type MachineUnitRecord = Prisma.MachineUnitGetPayload<{
  include: { mediaFiles: true; order: true };
}>;

type OrderRecord = Prisma.OrderGetPayload<{
  include: { machineUnits: true };
}>;

function buildOrderRecord(overrides: Partial<OrderRecord> & Pick<OrderRecord, 'machineUnits'>): OrderRecord {
  return {
    id: 'SO-0042',
    externalRef: 'zoho-so-42',
    customerName: 'Acme Hospitals',
    customerEmail: null,
    dueDate: new Date('2026-04-20T00:00:00.000Z'),
    destination: 'Factory dispatch lane',
    status: OrderStatus.PENDING,
    notes: null,
    createdAt: new Date('2026-04-13T00:00:00.000Z'),
    updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    createdById: null,
    machineUnits: overrides.machineUnits,
    ...overrides
  } as OrderRecord;
}

function buildMachineUnit(overrides: Partial<MachineUnitRecord> & Pick<MachineUnitRecord, 'id' | 'orderId'>): MachineUnitRecord {
  return {
    id: overrides.id,
    orderId: overrides.orderId,
    externalRef: 'line-1',
    serialNumber: null,
    qrCodeValue: null,
    name: 'Axial Fan Unit',
    sku: 'AFU-2',
    quantity: 1,
    status: MachineUnitStatus.PENDING,
    workflowStage: 'PACKING_TESTING',
    requiredVideoCount: 2,
    location: null,
    createdAt: new Date('2026-04-13T00:00:00.000Z'),
    updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    mediaFiles: [],
    order: buildOrderRecord({ machineUnits: [] }),
    ...overrides
  } as MachineUnitRecord;
}
