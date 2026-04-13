import { Router } from 'express';
import { mapZohoSalesOrder } from '../services/orderSync.js';

const sampleZohoOrders = [
  {
    salesorder_id: '60019065510-1',
    salesorder_number: 'BSM-24018',
    date: '2026-04-13',
    delivery_date: '2026-04-13',
    customer_name: 'Anand Cooling Towers',
    status: 'confirmed',
    line_items: [
      {
        line_item_id: 'line-1',
        name: 'Axial Fan Unit',
        quantity: 1,
        sku: 'AFU-01',
      },
    ],
  },
];

export function createOrdersRouter() {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({ data: sampleZohoOrders.map(mapZohoSalesOrder) });
  });

  router.post('/sync', (_request, response) => {
    response.status(202).json({
      success: true,
      message: 'Zoho Inventory sync queued',
      data: sampleZohoOrders.map(mapZohoSalesOrder),
    });
  });

  return router;
}
