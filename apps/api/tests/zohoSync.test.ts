import { describe, expect, it, vi } from 'vitest';
import type { DispatchRepository } from '../src/repositories/dispatchRepository.js';
import { createZohoSyncService, type ZohoSyncSummary } from '../src/services/zohoSync.js';
import type { ZohoSalesOrder } from '../src/lib/zoho.js';

describe('createZohoSyncService', () => {
  it('fetches active Zoho sales orders, reconciles each normalized order, and records a success summary', async () => {
    const fetchSalesOrders = vi.fn().mockResolvedValue([
      buildSalesOrder({ salesorder_id: 'zoho-so-1', salesorder_number: 'SO-1001' }),
      buildSalesOrder({ salesorder_id: 'zoho-so-2', salesorder_number: 'SO-1002', customer_name: 'Beta Industries' })
    ]);
    const reconcileZohoOrder = vi.fn(async (input) => ({
      order: {
        id: input.salesOrderNumber,
        salesOrderNumber: input.salesOrderNumber,
        customerName: input.customerName,
        deliveryDate: `${input.deliveryDate ?? input.orderDate}T00:00:00.000Z`,
        destination: 'Factory dispatch lane',
        status: 'Awaiting media',
        machineUnits: input.machineUnits.map((machineUnit) => ({
          id: `${input.salesOrderNumber}-${machineUnit.zohoLineItemId}`,
          zohoLineItemId: machineUnit.zohoLineItemId,
          productName: machineUnit.productName,
          quantity: machineUnit.quantity,
          sku: machineUnit.sku ?? null
        }))
      },
      deletedMachineUnitIds: input.salesOrderNumber === 'SO-1001' ? ['mu-stale-1', 'mu-stale-2'] : []
    }));

    const service = createZohoSyncService({
      dispatchRepository: buildDispatchRepository({ reconcileZohoOrder }),
      zohoClient: { fetchSalesOrders },
      intervalMs: 15 * 60 * 1000,
      now: sequenceDates('2026-04-13T19:00:00.000Z', '2026-04-13T19:00:05.000Z')
    });

    const result = await service.runManualSync();

    expect(fetchSalesOrders).toHaveBeenCalledTimes(1);
    expect(reconcileZohoOrder).toHaveBeenCalledTimes(2);
    expect(reconcileZohoOrder).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ zohoSalesOrderId: 'zoho-so-1', salesOrderNumber: 'SO-1001' })
    );
    expect(reconcileZohoOrder).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ zohoSalesOrderId: 'zoho-so-2', salesOrderNumber: 'SO-1002' })
    );
    expect(result).toEqual<ZohoSyncSummary>({
      trigger: 'manual',
      success: true,
      startedAt: '2026-04-13T19:00:00.000Z',
      completedAt: '2026-04-13T19:00:05.000Z',
      durationMs: 5000,
      fetchedOrderCount: 2,
      reconciledOrderCount: 2,
      failedOrderCount: 0,
      deletedMachineUnitCount: 2,
      reconciledOrders: [
        expect.objectContaining({ salesOrderNumber: 'SO-1001' }),
        expect.objectContaining({ salesOrderNumber: 'SO-1002' })
      ],
      failedOrders: []
    });
    expect(service.getLastSummary()).toEqual(result);
  });

  it('records per-order failures without aborting the rest of the sync run', async () => {
    const fetchSalesOrders = vi.fn().mockResolvedValue([
      buildSalesOrder({ salesorder_id: 'zoho-so-1', salesorder_number: 'SO-1001' }),
      buildSalesOrder({ salesorder_id: 'zoho-so-2', salesorder_number: 'SO-1002' })
    ]);
    const reconcileZohoOrder = vi
      .fn()
      .mockRejectedValueOnce(new Error('database temporarily unavailable'))
      .mockResolvedValueOnce({
        order: {
          id: 'SO-1002',
          salesOrderNumber: 'SO-1002',
          customerName: 'BSM Customer',
          deliveryDate: '2026-04-20T00:00:00.000Z',
          destination: 'Factory dispatch lane',
          status: 'Awaiting media',
          machineUnits: []
        },
        deletedMachineUnitIds: []
      });

    const service = createZohoSyncService({
      dispatchRepository: buildDispatchRepository({ reconcileZohoOrder }),
      zohoClient: { fetchSalesOrders },
      intervalMs: 15 * 60 * 1000,
      now: sequenceDates('2026-04-13T19:05:00.000Z', '2026-04-13T19:05:02.000Z')
    });

    const result = await service.runManualSync();

    expect(result.success).toBe(false);
    expect(result.fetchedOrderCount).toBe(2);
    expect(result.reconciledOrderCount).toBe(1);
    expect(result.failedOrderCount).toBe(1);
    expect(result.failedOrders).toEqual([
      {
        salesOrderNumber: 'SO-1001',
        zohoSalesOrderId: 'zoho-so-1',
        message: 'database temporarily unavailable'
      }
    ]);
    expect(result.reconciledOrders).toEqual([expect.objectContaining({ salesOrderNumber: 'SO-1002' })]);
  });

  it('schedules interval-based sync runs and skips overlapping executions', async () => {
    const scheduledCallbacks: Array<() => void | Promise<void>> = [];
    const setIntervalFn = vi.fn((callback: () => void | Promise<void>, _intervalMs: number) => {
      scheduledCallbacks.push(callback);
      return { id: 'timer-1' } as unknown as NodeJS.Timeout;
    });
    const clearIntervalFn = vi.fn();

    let resolveRun: (() => void) | undefined;
    const fetchSalesOrders = vi.fn(
      () => new Promise<ZohoSalesOrder[]>((resolve) => {
        resolveRun = () => resolve([buildSalesOrder({ salesorder_id: 'zoho-so-1', salesorder_number: 'SO-1001' })]);
      })
    );
    const reconcileZohoOrder = vi.fn().mockResolvedValue({
      order: {
        id: 'SO-1001',
        salesOrderNumber: 'SO-1001',
        customerName: 'BSM Customer',
        deliveryDate: '2026-04-20T00:00:00.000Z',
        destination: 'Factory dispatch lane',
        status: 'Awaiting media',
        machineUnits: []
      },
      deletedMachineUnitIds: []
    });

    const service = createZohoSyncService({
      dispatchRepository: buildDispatchRepository({ reconcileZohoOrder }),
      zohoClient: { fetchSalesOrders },
      intervalMs: 15 * 60 * 1000,
      setIntervalFn,
      clearIntervalFn,
      now: sequenceDates('2026-04-13T19:10:00.000Z', '2026-04-13T19:10:03.000Z')
    });

    service.start();
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 15 * 60 * 1000);

    scheduledCallbacks[0]?.();
    await Promise.resolve();
    const skippedRun = scheduledCallbacks[0]?.();
    await Promise.resolve();

    expect(fetchSalesOrders).toHaveBeenCalledTimes(1);
    expect(skippedRun).toBeUndefined();

    resolveRun?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(reconcileZohoOrder).toHaveBeenCalledTimes(1);
    expect(service.getLastSummary()).toEqual(
      expect.objectContaining({ trigger: 'scheduled', reconciledOrderCount: 1 })
    );

    service.stop();
    expect(clearIntervalFn).toHaveBeenCalledWith({ id: 'timer-1' });
  });

  it('captures scheduled fetch failures without leaking an unhandled rejection', async () => {
    const scheduledCallbacks: Array<() => void | Promise<void>> = [];
    const setIntervalFn = vi.fn((callback: () => void | Promise<void>, _intervalMs: number) => {
      scheduledCallbacks.push(callback);
      return { id: 'timer-2' } as unknown as NodeJS.Timeout;
    });

    const fetchSalesOrders = vi.fn().mockRejectedValue(new Error('zoho unavailable'));
    const reconcileZohoOrder = vi.fn();

    const service = createZohoSyncService({
      dispatchRepository: buildDispatchRepository({ reconcileZohoOrder }),
      zohoClient: { fetchSalesOrders },
      intervalMs: 15 * 60 * 1000,
      setIntervalFn,
      now: sequenceDates('2026-04-13T19:12:00.000Z', '2026-04-13T19:12:01.000Z')
    });

    service.start();

    scheduledCallbacks[0]?.();
    await Promise.resolve();
    expect(reconcileZohoOrder).not.toHaveBeenCalled();
    expect(service.getLastSummary()).toEqual(
      expect.objectContaining({
        trigger: 'scheduled',
        success: false,
        fetchedOrderCount: 0,
        failedOrderCount: 1,
        failedOrders: [
          expect.objectContaining({
            salesOrderNumber: 'N/A',
            zohoSalesOrderId: 'N/A',
            message: 'zoho unavailable'
          })
        ]
      })
    );
  });
});

function buildDispatchRepository(overrides: Partial<DispatchRepository>): DispatchRepository {
  return {
    listOrders: vi.fn().mockResolvedValue([]),
    reconcileZohoOrder: vi.fn(),
    getMachineUnitById: vi.fn().mockResolvedValue(null),
    generateSerialNumber: vi.fn().mockResolvedValue(null),
    generateQrCode: vi.fn().mockResolvedValue(null),
    updateMachineUnitWorkflowStage: vi.fn().mockResolvedValue(null),
    createMediaRecord: vi.fn().mockResolvedValue(null),
    deleteMediaRecord: vi.fn().mockResolvedValue(null),
    ...overrides
  };
}

function sequenceDates(...values: string[]) {
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]);
}

function buildSalesOrder(overrides: Partial<ZohoSalesOrder> = {}): ZohoSalesOrder {
  return {
    salesorder_id: 'zoho-so-1',
    salesorder_number: 'SO-1001',
    date: '2026-04-13',
    delivery_date: '2026-04-20',
    customer_name: 'BSM Customer',
    status: 'confirmed',
    line_items: [
      {
        line_item_id: 'line-1',
        name: 'Axial Fan Unit',
        quantity: 2,
        sku: 'AFU-2',
        image_url: 'https://example.com/afu.png'
      }
    ],
    ...overrides
  };
}
