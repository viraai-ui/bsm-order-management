import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  deleteMedia,
  fetchDashboardOrders,
  fetchDispatchOrdersByTeam,
  fetchMachineUnitById,
  fetchOrderById,
  groupOrdersByBucket,
  mapMachineUnitDetail,
  mapOrderToDispatchOrder,
  updateMachineWorkflowStage,
  uploadMediaToMachineUnit,
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
    const payload = {
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
      workflowStage: 'READY_FOR_DISPATCH' as const,
      dispatchedAt: null,
      dispatchNotes: null,
      mediaFiles: [
        {
          id: 'media-1',
          machineUnitId: 'MU-24018-1',
          kind: 'IMAGE' as const,
          fileName: 'proof-1.jpg',
          storagePath: 'seed/proof-1.jpg',
          mimeType: 'image/jpeg',
          createdAt: '2026-04-13T08:30:00Z',
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: payload,
        workflow: {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      }),
    }));

    await expect(fetchMachineUnitById('MU-24018-1')).resolves.toEqual(
      mapMachineUnitDetail(payload, {
        dispatchReady: true,
        nextStage: 'READY_FOR_DISPATCH',
      }),
    );
  });

  it('uploads a media record to a machine unit via multipart form data', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
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
          imageCount: 5,
          videoCount: 2,
          requiredVideoCount: 2,
          workflowStage: 'READY_FOR_DISPATCH',
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: [
            {
              id: 'media-2',
              machineUnitId: 'MU-24018-1',
              kind: 'IMAGE',
              fileName: 'fresh-proof.jpg',
              storagePath: 'uploads/MU-24018-1/fresh-proof.jpg',
              mimeType: 'image/jpeg',
              createdAt: '2026-04-13T09:30:00Z',
            },
          ],
        },
        workflow: {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchSpy);

    await expect(uploadMediaToMachineUnit('MU-24018-1', {
      kind: 'IMAGE',
      file: new File(['proof'], 'fresh-proof.jpg', { type: 'image/jpeg' }),
    })).resolves.toEqual(expect.objectContaining({
      photos: 5,
      mediaFiles: [expect.objectContaining({ fileName: 'fresh-proof.jpg', kind: 'IMAGE' })],
    }));

    expect(fetchSpy.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
  });

  it('deletes a media record via the API', async () => {
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
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: [],
        },
        workflow: {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      }),
    }));

    await expect(deleteMedia('media-2')).resolves.toEqual(expect.objectContaining({
      photos: 4,
      mediaFiles: [],
    }));
  });

  it('loads order detail from the order-first endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'BSM-24018',
          salesOrderNumber: 'BSM-24018',
          customerName: 'Anand Cooling Towers',
          customerEmail: 'ops@anand.example',
          deliveryDate: '2026-04-13T08:30:00Z',
          destination: 'Delhi NCR',
          status: 'Dispatch ready',
          teamAssignment: 'TEAM_A',
          assignedAt: '2026-04-12T09:00:00Z',
          machineUnitCount: 1,
          totalQuantity: 1,
          imageCount: 4,
          videoCount: 2,
          requiredVideoCount: 2,
          serialNumberCount: 1,
          qrCodeCount: 1,
          notes: null,
          createdAt: '2026-04-12T09:00:00Z',
          updatedAt: '2026-04-13T08:00:00Z',
          workflowSummary: {
            awaitingMediaCount: 0,
            mediaUploadedCount: 0,
            readyForDispatchCount: 1,
            dispatchedCount: 0,
          },
          machineUnits: [{
            id: 'MU-24018-1',
            zohoLineItemId: 'line-1',
            productName: 'Axial Fan Unit',
            quantity: 1,
            serialNumber: '262700014',
            qrCodeValue: 'qr://262700014',
            imageCount: 4,
            videoCount: 2,
            requiredVideoCount: 2,
            workflowStage: 'READY_FOR_DISPATCH',
            mediaFiles: [],
          }],
        },
      }),
    }));

    await expect(fetchOrderById('BSM-24018')).resolves.toEqual(expect.objectContaining({
      id: 'BSM-24018',
      teamAssignment: 'TEAM_A',
      machineUnitCount: 1,
      workflowSummary: expect.objectContaining({ readyForDispatchCount: 1 }),
    }));
  });

  it('falls back to grouping order list data when team dispatch endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'BSM-24018',
              salesOrderNumber: 'BSM-24018',
              customerName: 'Anand Cooling Towers',
              destination: 'Delhi NCR',
              deliveryDate: '2026-04-13T08:30:00Z',
              status: 'Awaiting media',
              teamAssignment: 'TEAM_A',
              machineUnits: [{ id: 'MU-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 }],
            },
            {
              id: 'BSM-24019',
              salesOrderNumber: 'BSM-24019',
              customerName: 'Northline Infra',
              destination: 'Lucknow',
              deliveryDate: '2026-04-14T08:30:00Z',
              status: 'Testing complete',
              teamAssignment: 'TEAM_B',
              machineUnits: [{ id: 'MU-2', zohoLineItemId: 'line-2', productName: 'Frame', quantity: 1 }],
            },
          ],
        }),
      }));

    await expect(fetchDispatchOrdersByTeam()).resolves.toEqual({
      TEAM_A: [expect.objectContaining({ id: 'BSM-24018' })],
      TEAM_B: [expect.objectContaining({ id: 'BSM-24019' })],
    });
  });

  it('updates the machine workflow stage via the API', async () => {
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
          workflowStage: 'MEDIA_UPLOADED',
          dispatchedAt: null,
          dispatchNotes: null,
          mediaFiles: [],
        },
        workflow: {
          dispatchReady: true,
          nextStage: 'READY_FOR_DISPATCH',
        },
      }),
    }));

    await expect(updateMachineWorkflowStage('MU-24018-1', 'MEDIA_UPLOADED')).resolves.toEqual(
      expect.objectContaining({ workflowStage: 'Ready for Dispatch' }),
    );
  });
});
