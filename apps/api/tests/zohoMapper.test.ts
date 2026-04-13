import type { ZohoSalesOrder } from '../src/lib/zoho.js';
import { mapZohoSalesOrder } from '../src/services/zohoMapper.js';

describe('mapZohoSalesOrder', () => {
  it('maps a Zoho sales order into the normalized internal order shape', () => {
    const order = buildSalesOrder({
      salesorder_id: 'so-42',
      salesorder_number: 'SO-0042',
      date: '2026-04-13',
      delivery_date: '2026-04-20',
      customer_name: 'Acme Hospitals',
      status: 'confirmed',
      line_items: [
        {
          line_item_id: 'line-1',
          name: 'Axial Fan Unit',
          quantity: 2,
          sku: 'AFU-2',
          image_url: 'https://example.com/afu.png'
        },
        {
          line_item_id: 'line-2',
          name: 'Control Panel',
          quantity: 1
        }
      ]
    });

    expect(mapZohoSalesOrder(order)).toEqual({
      zohoSalesOrderId: 'so-42',
      salesOrderNumber: 'SO-0042',
      orderDate: '2026-04-13',
      deliveryDate: '2026-04-20',
      customerName: 'Acme Hospitals',
      status: 'confirmed',
      machineUnits: [
        {
          zohoLineItemId: 'line-1',
          productName: 'Axial Fan Unit',
          sku: 'AFU-2',
          quantity: 2,
          productImageUrl: 'https://example.com/afu.png'
        },
        {
          zohoLineItemId: 'line-2',
          productName: 'Control Panel',
          sku: undefined,
          quantity: 1,
          productImageUrl: undefined
        }
      ]
    });
  });

  it('does not introduce internal workflow progress fields during Zoho normalization', () => {
    const normalized = mapZohoSalesOrder(buildSalesOrder());

    expect(normalized).not.toHaveProperty('workflowStage');
    expect(normalized).not.toHaveProperty('dispatchReady');
    expect(normalized.machineUnits[0]).not.toHaveProperty('workflowStage');
    expect(normalized.machineUnits[0]).not.toHaveProperty('dispatchReady');
  });
});

function buildSalesOrder(overrides: Partial<ZohoSalesOrder> = {}): ZohoSalesOrder {
  return {
    salesorder_id: 'so-default',
    salesorder_number: 'SO-0001',
    date: '2026-04-13',
    delivery_date: '2026-04-20',
    customer_name: 'BSM Customer',
    status: 'confirmed',
    line_items: [
      {
        line_item_id: 'line-1',
        name: 'Axial Fan Unit',
        quantity: 2,
        sku: 'AFU-2',
        image_url: 'https://example.com/afu.png'
      }
    ],
    ...overrides
  };
}
