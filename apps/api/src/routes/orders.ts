import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import type { ZohoSyncService } from '../services/zohoSync.js';

export function createOrdersRouter(dispatchRepository: DispatchRepository, zohoSyncService?: ZohoSyncService) {
  const router = Router();

  router.get('/', async (_request, response) => {
    const data = await dispatchRepository.listOrders();
    response.status(200).json({ data });
  });

  router.post('/sync', async (_request, response) => {
    if (!zohoSyncService) {
      response.status(503).json({ error: 'Zoho sync is not configured' });
      return;
    }

    const data = await zohoSyncService.runManualSync();
    response.status(200).json({ data });
  });

  return router;
}
