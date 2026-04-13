import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import { queueZohoSync } from '../services/zohoSync.js';

export function createOrdersRouter(dispatchRepository: DispatchRepository) {
  const router = Router();

  router.get('/', async (_request, response) => {
    const data = await dispatchRepository.listOrders();
    response.status(200).json({ data });
  });

  router.post('/sync', async (_request, response) => {
    const result = await queueZohoSync(dispatchRepository);
    response.status(202).json(result);
  });

  return router;
}
