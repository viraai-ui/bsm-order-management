import { Router } from 'express';

export function createOrdersRouter() {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({ data: [] });
  });

  return router;
}
