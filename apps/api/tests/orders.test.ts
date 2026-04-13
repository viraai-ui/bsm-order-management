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

  it('keeps Zoho sync mocked but separated from the persisted read path', async () => {
    const app = createApp({ dispatchRepository: createFakeDispatchRepository() });

    const response = await request(app).post('/orders/sync');

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('mocked');
    expect(response.body.data[0].salesOrderNumber).toBe('BSM-24018');
  });
});
