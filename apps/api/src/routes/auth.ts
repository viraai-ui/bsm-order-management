import { Router } from 'express';
import { AuthService, clearSessionCookie, loginSchema, requireAuth, setSessionCookie } from '../lib/auth.js';

export function createAuthRouter(authService: AuthService) {
  const router = Router();

  router.post('/login', async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid request payload' });
      return;
    }

    const user = await authService.validateCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      response.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = authService.signSession(user);
    setSessionCookie(response, token);
    response.status(200).json({ user });
  });

  router.get('/me', requireAuth(authService), (request, response) => {
    response.status(200).json({ user: request.user });
  });

  router.post('/logout', (_request, response) => {
    clearSessionCookie(response);
    response.status(200).json({ success: true });
  });

  return router;
}
