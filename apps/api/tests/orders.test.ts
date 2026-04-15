import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFakeDispatchRepository } from './helpers/fakeDispatchRepository.js';

describe('order routes', () => {
  it('returns persisted orders shaped for order-first modules', async () => {
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
          teamAssignment: 'TEAM_A',
          machineUnitCount: 1,
          imageCount: 4,
          qrCodeCount: 0,
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

  it('filters orders by team assignment for dispatch views', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).get('/orders').query({ teamAssignment: 'TEAM_B' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((order: { teamAssignment: string }) => order.teamAssignment === 'TEAM_B')).toBe(true);
  });

  it('returns grouped dispatch data by team', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).get('/orders/dispatch');

    expect(response.status).toBe(200);
    expect(response.body.data.TEAM_A).toHaveLength(2);
    expect(response.body.data.TEAM_B).toHaveLength(2);
  });

  it('returns order detail with machine units and workflow summary', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).get('/orders/BSM-24021');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'BSM-24021',
      teamAssignment: 'TEAM_B',
      qrCodeCount: 1,
      workflowSummary: {
        readyForDispatchCount: 1,
      },
      machineUnits: [
        expect.objectContaining({
          id: 'MU-24021-1',
          serialNumber: '262700014',
          qrCodeValue: 'qr://262700014',
        })
      ]
    });
  });

  it('updates manual order team assignment', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app)
      .patch('/orders/BSM-24018/team-assignment')
      .send({ teamAssignment: 'TEAM_B' });

    expect(response.status).toBe(200);
    expect(response.body.data.teamAssignment).toBe('TEAM_B');
  });

  it('generates missing order qrs across all machine units', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).post('/orders/BSM-24018/generate-qrs');

    expect(response.status).toBe(200);
    expect(response.body.data.qrCodeCount).toBe(1);
    expect(response.body.data.machineUnits[0]).toMatchObject({
      serialNumber: '262700025',
      qrCodeValue: 'qr://262700025',
    });
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
          externalRef: 'zoho-so-1',
          customerName: 'BSM Customer',
          customerEmail: null,
          deliveryDate: '2026-04-20T00:00:00.000Z',
          destination: 'Factory dispatch lane',
          status: 'Awaiting media',
          teamAssignment: 'TEAM_A',
          assignedAt: '2026-04-13T19:15:00.000Z',
          machineUnitCount: 0,
          totalQuantity: 0,
          imageCount: 0,
          videoCount: 0,
          requiredVideoCount: 0,
          serialNumberCount: 0,
          qrCodeCount: 0,
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

  it('returns 503 from POST /orders/sync when Zoho sync is not configured', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).post('/orders/sync');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Zoho sync is not configured' });
  });
});
