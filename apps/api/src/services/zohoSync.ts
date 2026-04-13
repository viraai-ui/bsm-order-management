import type { DispatchRepository } from '../repositories/dispatchRepository.js';

export async function queueZohoSync(dispatchRepository: DispatchRepository) {
  const data = await dispatchRepository.listOrders();

  return {
    success: true,
    message: 'Zoho Inventory sync is still mocked until OAuth scopes are available',
    data
  };
}
