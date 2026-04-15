import { MachineUnitStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { PrismaDispatchRepository } from '../src/repositories/dispatchRepository.js';
import { createFakeDispatchRepository } from './helpers/fakeDispatchRepository.js';

describe('dispatch completion route', () => {
  it('blocks dispatch completion until the machine unit is ready', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app)
      .post('/machine-units/MU-24018-1/dispatch')
      .send({ dispatchNotes: 'Loaded on truck 3' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Machine unit is not ready for dispatch');
    expect(response.body.blockers).toEqual([
      'Serial number is missing',
      'QR code is missing',
      'At least 2 testing videos are required',
    ]);
  });

  it('marks a ready machine unit as dispatched and returns the updated detail', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app)
      .post('/machine-units/MU-24021-1/dispatch')
      .send({ dispatchNotes: 'Handed to carrier at dock 2' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'MU-24021-1',
      workflowStage: 'DISPATCHED',
      dispatchedAt: expect.any(String),
      dispatchNotes: 'Handed to carrier at dock 2',
    });
    expect(response.body.workflow).toMatchObject({
      dispatchReady: false,
      blockers: [],
      nextStage: 'DISPATCHED',
    });
  });
});

describe('PrismaDispatchRepository dispatch completion', () => {
  it('persists dispatched stage, timestamp, notes, and status', async () => {
    const machineUnitRecord = buildMachineUnitRecord({
      id: 'MU-24021-1',
      orderId: 'BSM-24021',
      workflowStage: 'READY_FOR_DISPATCH',
      status: MachineUnitStatus.READY,
      serialNumber: '262700014',
      qrCodeValue: 'qr://262700014',
    });

    const updatedRecord = buildMachineUnitRecord({
      ...machineUnitRecord,
      workflowStage: 'DISPATCHED',
      status: MachineUnitStatus.DISPATCHED,
      dispatchedAt: new Date('2026-04-15T11:30:00.000Z'),
      dispatchNotes: 'Loaded and sealed',
    });

    const prisma = {
      order: { count: vi.fn().mockResolvedValue(1) },
      machineUnit: {
        findUnique: vi.fn().mockResolvedValue(machineUnitRecord),
        update: vi.fn().mockResolvedValue(updatedRecord),
      },
    };

    const repository = new PrismaDispatchRepository(prisma as never);
    const dispatchedAt = new Date('2026-04-15T11:30:00.000Z');

    const result = await repository.completeMachineUnitDispatch({
      id: 'MU-24021-1',
      dispatchedAt,
      dispatchNotes: 'Loaded and sealed',
    });

    expect(prisma.machineUnit.update).toHaveBeenCalledWith({
      where: { id: 'MU-24021-1' },
      data: {
        workflowStage: 'DISPATCHED',
        status: MachineUnitStatus.DISPATCHED,
        dispatchedAt,
        dispatchNotes: 'Loaded and sealed',
      },
      include: { mediaFiles: true, order: true },
    });
    expect(result).toMatchObject({
      id: 'MU-24021-1',
      workflowStage: 'DISPATCHED',
      dispatchedAt: '2026-04-15T11:30:00.000Z',
      dispatchNotes: 'Loaded and sealed',
    });
  });
});

type MachineUnitRecord = Prisma.MachineUnitGetPayload<{
  include: { mediaFiles: true; order: true };
}>;

function buildMachineUnitRecord(
  overrides: Partial<MachineUnitRecord> & Pick<MachineUnitRecord, 'id' | 'orderId'>,
): MachineUnitRecord {
  return {
    id: overrides.id,
    orderId: overrides.orderId,
    externalRef: 'line-1',
    serialNumber: '262700014',
    qrCodeValue: 'qr://262700014',
    name: 'Pressure Pump Assembly',
    sku: 'PPA-02',
    quantity: 1,
    status: MachineUnitStatus.READY,
    workflowStage: 'READY_FOR_DISPATCH',
    requiredVideoCount: 2,
    location: null,
    dispatchedAt: null,
    dispatchNotes: null,
    createdAt: new Date('2026-04-13T00:00:00.000Z'),
    updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    mediaFiles: [
      {
        id: 'media-image-1',
        orderId: overrides.orderId,
        machineUnitId: overrides.id,
        kind: 'IMAGE',
        fileName: 'proof.jpg',
        storagePath: 'seed/proof.jpg',
        mimeType: 'image/jpeg',
        publicUrl: null,
        sizeBytes: 1024,
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      },
      {
        id: 'media-video-1',
        orderId: overrides.orderId,
        machineUnitId: overrides.id,
        kind: 'VIDEO',
        fileName: 'test-1.mp4',
        storagePath: 'seed/test-1.mp4',
        mimeType: 'video/mp4',
        publicUrl: null,
        sizeBytes: 2048,
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      },
      {
        id: 'media-video-2',
        orderId: overrides.orderId,
        machineUnitId: overrides.id,
        kind: 'VIDEO',
        fileName: 'test-2.mp4',
        storagePath: 'seed/test-2.mp4',
        mimeType: 'video/mp4',
        publicUrl: null,
        sizeBytes: 2048,
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      },
    ],
    order: {
      id: overrides.orderId,
      externalRef: 'zoho-so-21',
      customerName: 'Shiv Pumps',
      customerEmail: null,
      dueDate: new Date('2026-04-13T13:00:00.000Z'),
      destination: 'Jaipur',
      status: 'READY_FOR_DISPATCH',
      notes: null,
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      createdById: null,
    },
    ...overrides,
  } as MachineUnitRecord;
}
