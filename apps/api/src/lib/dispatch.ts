export type WorkflowStage = 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH';

export type MachineUnitApiRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  destination: string;
  scheduledFor: string | null;
  productName: string;
  serialNumber: string | null;
  qrCodeValue: string | null;
  imageCount: number;
  videoCount: number;
  requiredVideoCount: number;
  workflowStage: WorkflowStage;
};

export type OrderApiRecord = {
  id: string;
  salesOrderNumber: string;
  customerName: string;
  deliveryDate: string | null;
  destination: string;
  status: string;
  machineUnits: Array<{
    id: string;
    zohoLineItemId: string;
    productName: string;
    quantity: number;
    sku?: string | null;
  }>;
};
