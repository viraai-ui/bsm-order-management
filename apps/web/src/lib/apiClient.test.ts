import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  fetchDashboardOrders,
  fetchMachineUnitById,
  groupOrdersByBucket,
  mapMachineUnitDetail,
  mapOrderToDispatchOrder,
} from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('groups mapped dashboard orders into dispatch buckets', () => {
    const orders = [
      mapOrderToDispatchOrder({
        id: '1',
        salesOrderNumber: 'BSM-24018',
        customerName: 'Anand Cooling Towers',
        deliveryDate: '2026-04-13T08:30:00Z',
        destination: 'Delhi NCR',
        status: 'Awaiting media',
        machineUnits: [{ id: 'MU-24018-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 }],
      }, 0),
      mapOrderToDispatchOrder({
        id: '2',
        salesOrderNumber: 'BSM-24021',
        customerName: 'Shiv Pumps',
        deliveryDate: '2026-04-14T13:00:00Z',
        destination: 'Jaipur',
        status: 'Testing complete',
        machineUnits: [{ id: 'MU-24021-1', zohoLineItemId: 'line-2', productName: 'Pressure Pump Assembly', quantity: 1 }],
      }, 1),
    ];

    const grouped = groupOrdersByBucket(orders);

    expect(grouped.Urgent).toHaveLength(1);
    expect(grouped.Today).toHaveLength(0);
    expect(grouped.Tomorrow).toHaveLength(1);
    expect(grouped.Later).toHaveLength(0);
    expect(grouped.Urgent[0]?.id).toBe('BSM-24018');
  });

  it('loads dashboard orders from the API without falling back to snapshots', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          id: '1',
          salesOrderNumber: 'BSM-24018',
          customerName: 'Anand Cooling Towers',
          deliveryDate: '2026-04-13T08:30:00Z',
          destination: 'Delhi NCR',
          status: 'Awaiting media',
          machineUnits: [{ id: 'MU-24018-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 }],
        }],
      }),
    }));

    await expect(fetchDashboardOrders()).resolves.toEqual([
      expect.objectContaining({ id: 'BSM-24018', machineUnitId: 'MU-24018-1' }),
    ]);
  });

  it('throws API errors instead of returning fallback dashboard data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Dispatch API offline' }),
    }));

    await expect(fetchDashboardOrders()).rejects.toEqual(expect.objectContaining<ApiError>({
      name: 'ApiError',
      message: 'Dispatch API offline',
      status: 503,
    }));
  });

  it('maps machine unit detail from the API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'MU-24018-1',
          orderId: 'order-1',
          orderNumber: 'BSM-24018',
          customerName: 'Anand Cooling Towers',
          destination: 'Delhi NCR',
          scheduledFor: '2026-04-13T08:30:00Z',
          productName: 'Axial Fan Unit',
          serialNumber: '262700014',
          qrCodeValue: 'qr-1',
          imageCount: 4,
          videoCount: 2,
          requiredVideoCount: 2,
          workflowStage: 'READY_FOR_DISPATCH',
        },
        workflow: {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      }),
    }));

    await expect(fetchMachineUnitById('MU-24018-1')).resolves.toEqual(
      mapMachineUnitDetail(
        {
          id: 'MU-24018-1',
          orderId: 'order-1',
          orderNumber: 'BSM-24018',
          customerName: 'Anand Cooling Towers',
          destination: 'Delhi NCR',
          scheduledFor: '2026-04-13T08:30:00Z',
          productName: 'Axial Fan Unit',
          serialNumber: '262700014',
          qrCodeValue: 'qr-1',
          imageCount: 4,
          videoCount: 2,
          requiredVideoCount: 2,
          workflowStage: 'READY_FOR_DISPATCH',
        },
        {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      ),
    );
  });
});
