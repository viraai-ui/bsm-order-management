export type WorkflowStage = 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH' | 'DISPATCHED';

export type MediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export type MediaApiRecord = {
  id: string;
  machineUnitId: string;
  kind: MediaKind;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  publicUrl: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

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
  mediaFiles: MediaApiRecord[];
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
