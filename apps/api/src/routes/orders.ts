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

  router.get('/dispatch', async (request, response) => {
    const team = request.query.team === 'split'
      ? 'split'
      : parseTeamAssignment(request.query.team);
    const data = await dispatchRepository.listDispatchOrders(team ? { team } : undefined);
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

  router.post('/:id/qr/complete', async (request, response) => {
    const order = await dispatchRepository.completeOrderQr(request.params.id);

    if (!order) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    response.status(200).json({ data: order });
  });

  router.post('/dispatch/reorder', async (request, response) => {
    const teamAssignment = parseTeamAssignment(request.body?.teamAssignment);
    const orderedIds = Array.isArray(request.body?.orderedIds)
      ? request.body.orderedIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : null;

    if (!teamAssignment || !orderedIds) {
      response.status(400).json({ error: 'teamAssignment must be TEAM_A or TEAM_B and orderedIds must be a string array' });
      return;
    }

    const data = await dispatchRepository.reorderDispatchQueue({ teamAssignment, orderedIds });
    response.status(200).json({ data });
  });

  router.post('/:id/dispatch/complete', async (request, response) => {
    const existing = await dispatchRepository.getOrderById(request.params.id);

    if (!existing) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = await dispatchRepository.completeDispatch({ id: request.params.id });
    response.status(200).json({ data: order ?? existing });
  });

  router.post('/:id/close', async (request, response) => {
    const existing = await dispatchRepository.getOrderById(request.params.id);

    if (!existing) {
      response.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = await dispatchRepository.closeOrder(request.params.id);
    if (!order) {
      response.status(409).json({ error: 'Order is not ready to close' });
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
