import request from 'supertest';
import { createApp } from '../src/app.js';

describe('health routes', () => {
  it('returns ok for /health', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'bsm-order-management-api'
    });
  });

  it('returns ready for /ready', async () => {
    const app = createApp();

    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
