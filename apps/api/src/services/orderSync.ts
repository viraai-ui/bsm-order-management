export type ZohoLineItem = {
  line_item_id: string;
  name: string;
  quantity: number;
  sku?: string;
  image_url?: string;
};

export type ZohoSalesOrder = {
  salesorder_id: string;
  salesorder_number: string;
  date: string;
  delivery_date?: string;
  customer_name: string;
  status: string;
  line_items: ZohoLineItem[];
};

export type NormalizedMachineUnit = {
  zohoLineItemId: string;
  productName: string;
  sku?: string;
  quantity: number;
  productImageUrl?: string;
};

export type NormalizedOrder = {
  zohoSalesOrderId: string;
  salesOrderNumber: string;
  orderDate: string;
  deliveryDate?: string;
  customerName: string;
  status: string;
  machineUnits: NormalizedMachineUnit[];
};

export function mapZohoSalesOrder(order: ZohoSalesOrder): NormalizedOrder {
  return {
    zohoSalesOrderId: order.salesorder_id,
    salesOrderNumber: order.salesorder_number,
    orderDate: order.date,
    deliveryDate: order.delivery_date,
    customerName: order.customer_name,
    status: order.status,
    machineUnits: order.line_items.map((item) => ({
      zohoLineItemId: item.line_item_id,
      productName: item.name,
      sku: item.sku,
      quantity: item.quantity,
      productImageUrl: item.image_url,
    })),
  };
}
