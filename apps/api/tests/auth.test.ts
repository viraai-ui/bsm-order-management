import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('auth routes', () => {
  async function buildApp() {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    return createApp({
      auth: {
        jwtSecret: 'test-secret',
        seedUser: {
          id: 'user_123',
          email: 'admin@bsm.local',
          name: 'BSM Admin',
          role: 'ADMIN',
          passwordHash
        }
      }
    });
  }

  it('logs in and returns the current user', async () => {
    const app = await buildApp();

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@bsm.local', password: 'Password123!' });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toMatchObject({
      email: 'admin@bsm.local',
      name: 'BSM Admin',
      role: 'ADMIN'
    });
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('bsm_session=')])
    );

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', loginResponse.headers['set-cookie']);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe('admin@bsm.local');
  });

  it('rejects invalid credentials', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@bsm.local', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('clears the session on logout', async () => {
    const app = await buildApp();

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@bsm.local', password: 'Password123!' });

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Cookie', loginResponse.headers['set-cookie']);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('bsm_session=;')])
    );

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', logoutResponse.headers['set-cookie']);

    expect(meResponse.status).toBe(401);
  });
});
