import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFakeDispatchRepository } from './helpers/fakeDispatchRepository.js';

describe('order routes', () => {
  it('returns persisted orders shaped for the dashboard', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).get('/orders');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'BSM-24018',
          salesOrderNumber: 'BSM-24018',
          customerName: 'Anand Cooling Towers',
          destination: 'Delhi NCR',
          machineUnits: [
            expect.objectContaining({
              id: 'MU-24018-1',
              productName: 'Axial Fan Unit'
            })
          ]
        })
      ])
    );
  });

  it('runs a manual Zoho sync via POST /orders/sync and returns the latest summary', async () => {
    const syncSummary = {
      trigger: 'manual',
      success: true,
      startedAt: '2026-04-13T19:15:00.000Z',
      completedAt: '2026-04-13T19:15:04.000Z',
      durationMs: 4000,
      fetchedOrderCount: 2,
      reconciledOrderCount: 2,
      failedOrderCount: 0,
      deletedMachineUnitCount: 1,
      reconciledOrders: [
        {
          id: 'SO-1001',
          salesOrderNumber: 'SO-1001',
          customerName: 'BSM Customer',
          deliveryDate: '2026-04-20T00:00:00.000Z',
          destination: 'Factory dispatch lane',
          status: 'Awaiting media',
          machineUnits: []
        }
      ],
      failedOrders: []
    };
    const zohoSyncService = {
      start: vi.fn(),
      stop: vi.fn(),
      getLastSummary: vi.fn().mockReturnValue(syncSummary),
      runManualSync: vi.fn().mockResolvedValue(syncSummary)
    };

    const app = createApp({
      dispatchRepository: createFakeDispatchRepository(),
      zohoSyncService
    });

    const response = await request(app).post('/orders/sync');

    expect(zohoSyncService.start).toHaveBeenCalledTimes(1);
    expect(zohoSyncService.runManualSync).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: syncSummary });
  });
});
