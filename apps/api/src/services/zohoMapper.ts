import type {
  NormalizedMachineUnit,
  NormalizedOrder,
  ZohoLineItem,
  ZohoSalesOrder
} from '../lib/zoho.js';

export function mapZohoSalesOrder(order: ZohoSalesOrder): NormalizedOrder {
  return {
    zohoSalesOrderId: order.salesorder_id,
    salesOrderNumber: order.salesorder_number,
    orderDate: order.date,
    deliveryDate: order.delivery_date,
    customerName: order.customer_name,
    status: order.status,
    machineUnits: (order.line_items ?? []).map(mapZohoLineItem)
  };
}

function mapZohoLineItem(item: ZohoLineItem): NormalizedMachineUnit {
  return {
    zohoLineItemId: item.line_item_id,
    productName: item.name,
    sku: item.sku,
    quantity: item.quantity,
    productImageUrl: item.image_url
  };
}
