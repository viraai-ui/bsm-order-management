import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFakeDispatchRepository } from './helpers/fakeDispatchRepository.js';

describe('machine unit routes', () => {
  it('generates a qr code after serial generation', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const serialResponse = await request(app).post('/machine-units/MU-24018-1/generate-serial');
    expect(serialResponse.status).toBe(200);
    expect(serialResponse.body.data.serialNumber).toBe('262700025');

    const qrResponse = await request(app).post('/machine-units/MU-24018-1/generate-qr');

    expect(qrResponse.status).toBe(200);
    expect(qrResponse.body.data.qrCodeValue).toBe('qr://262700025');
  });

  it('blocks ready-for-dispatch until serial, qr, and required media exist', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app)
      .patch('/machine-units/MU-24018-1')
      .send({ workflowStage: 'READY_FOR_DISPATCH' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Machine unit is not ready for dispatch');
    expect(response.body.blockers).toEqual([
      'Serial number is missing',
      'QR code is missing',
      'At least 2 testing videos are required',
    ]);
  });

  it('allows ready-for-dispatch after serial and qr are present for complete media', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    await request(app).post('/machine-units/MU-24018-1/generate-serial');
    await request(app).post('/machine-units/MU-24018-1/generate-qr');

    const response = await request(app)
      .patch('/machine-units/MU-24021-1')
      .send({ workflowStage: 'READY_FOR_DISPATCH' });

    expect(response.status).toBe(200);
    expect(response.body.data.workflowStage).toBe('READY_FOR_DISPATCH');
  });

  it('returns persisted machine unit context from the repository', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).get('/machine-units/MU-24021-1');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'MU-24021-1',
      orderId: 'BSM-24021',
      customerName: 'Shiv Pumps',
      destination: 'Jaipur',
      imageCount: 6,
      videoCount: 2,
      workflowStage: 'READY_FOR_DISPATCH'
    });
    expect(response.body.workflow.dispatchReady).toBe(true);
  });
});
