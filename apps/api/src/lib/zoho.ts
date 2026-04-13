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
