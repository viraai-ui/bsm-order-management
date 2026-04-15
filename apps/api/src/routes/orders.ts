import { type TeamAssignment } from '@prisma/client';
import { Router } from 'express';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';
import type { ZohoSyncService } from '../services/zohoSync.js';

const TEAM_ASSIGNMENTS: TeamAssignment[] = ['TEAM_A', 'TEAM_B'];

function parseTeamAssignment(value: unknown): TeamAssignment | null {
  return typeof value === 'string' && TEAM_ASSIGNMENTS.includes(value as TeamAssignment)
    ? (value as TeamAssignment)
    : null;
}

export function createOrdersRouter(dispatchRepository: DispatchRepository, zohoSyncService?: ZohoSyncService) {
  const router = Router();

  router.get('/', async (request, response) => {
    const teamAssignment = parseTeamAssignment(request.query.teamAssignment);
    const data = await dispatchRepository.listOrders(teamAssignment ? { teamAssignment } : undefined);
    response.status(200).json({ data });
  });

  router.get('/dispatch', async (_request, response) => {
    const data = await dispatchRepository.listDispatchOrders();
    response.status(200).json({ data });
  });

  router.get('/:id', async (request, response) => {
    const order = await dispatchRepository.getOrderById(request.params.id);

    if (!order) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    response.status(200).json({ data: order });
  });

  router.patch('/:id/team-assignment', async (request, response) => {
    const teamAssignment = parseTeamAssignment(request.body?.teamAssignment);

    if (!teamAssignment) {
      response.status(400).json({ error: 'teamAssignment must be TEAM_A or TEAM_B' });
      return;
    }

    const order = await dispatchRepository.updateOrderTeamAssignment({
      id: request.params.id,
      teamAssignment,
    });

    if (!order) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    response.status(200).json({ data: order });
  });

  router.post('/:id/generate-qrs', async (request, response) => {
    const order = await dispatchRepository.generateOrderQrs(request.params.id);

    if (!order) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    response.status(200).json({ data: order });
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
