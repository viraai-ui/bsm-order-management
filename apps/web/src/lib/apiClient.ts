export type DispatchBucket = 'Urgent' | 'Today' | 'Tomorrow' | 'Later';

export type DispatchOrder = {
  id: string;
  machineUnitId: string;
  customer: string;
  destination: string;
  scheduledFor: string;
  bucket: DispatchBucket;
  status: 'Awaiting media' | 'Ready to pack' | 'Testing complete' | 'Dispatch ready' | 'Dispatched';
  priority: 'High' | 'Medium' | 'Normal';
};

export type MediaRecord = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName: string;
  mimeType: string | null;
  createdAt: string;
};

export type MachineUnitDetail = {
  id: string;
  unitCode: string;
  orderId: string;
  customer: string;
  destination: string;
  scheduledFor: string;
  productName: string;
  serialNumber: string | null;
  qrReady: boolean;
  mediaComplete: boolean;
  workflowStage: 'Packing / Testing' | 'Media Uploaded' | 'Ready for Dispatch' | 'Dispatched';
  photos: number;
  videos: number;
  requiredVideos: number;
  mediaFiles: MediaRecord[];
  dispatchedAt?: string | null;
  dispatchNotes?: string | null;
};

type OrdersApiItem = {
  id: string;
  salesOrderNumber: string;
  customerName: string;
  deliveryDate: string | null;
  destination: string;
  status: DispatchOrder['status'];
  machineUnits: {
    id: string;
    zohoLineItemId: string;
    productName: string;
    quantity: number;
  }[];
};

type MachineUnitApiItem = {
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
  workflowStage: 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH' | 'DISPATCHED';
  dispatchedAt: string | null;
  dispatchNotes: string | null;
  mediaFiles: {
    id: string;
    machineUnitId: string;
    kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName: string;
    storagePath: string;
    mimeType: string | null;
    createdAt: string;
  }[];
};

type WorkflowApiItem = {
  dispatchReady: boolean;
  nextStage: 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH' | 'DISPATCHED';
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function groupOrdersByBucket(orders: DispatchOrder[]) {
  return {
    Urgent: orders.filter((order) => order.bucket === 'Urgent'),
    Today: orders.filter((order) => order.bucket === 'Today'),
    Tomorrow: orders.filter((order) => order.bucket === 'Tomorrow'),
    Later: orders.filter((order) => order.bucket === 'Later'),
  };
}

function formatSchedule(value: string | null | undefined) {
  if (!value) return 'TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

function mapScheduleToBucket(value: string | null | undefined): DispatchBucket {
  if (!value) return 'Later';

  const schedule = new Date(value);
  if (Number.isNaN(schedule.getTime())) return 'Later';

  const now = new Date('2026-04-13T00:00:00Z');
  const diffDays = Math.floor((schedule.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return schedule.getUTCHours() < 12 ? 'Urgent' : 'Today';
  }

  if (diffDays === 1) return 'Tomorrow';
  return 'Later';
}

function mapWorkflowStage(nextStage: WorkflowApiItem['nextStage']): MachineUnitDetail['workflowStage'] {
  if (nextStage === 'DISPATCHED') return 'Dispatched';
  if (nextStage === 'READY_FOR_DISPATCH') return 'Ready for Dispatch';
  if (nextStage === 'MEDIA_UPLOADED') return 'Media Uploaded';
  return 'Packing / Testing';
}

export function mapOrderToDispatchOrder(order: OrdersApiItem, index: number): DispatchOrder {
  const machine = order.machineUnits[0];

  return {
    id: order.salesOrderNumber,
    machineUnitId: machine?.id ?? `MU-${index + 1}`,
    customer: order.customerName,
    destination: order.destination,
    scheduledFor: formatSchedule(order.deliveryDate),
    bucket: mapScheduleToBucket(order.deliveryDate),
    status: order.status,
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Normal',
  };
}

export function mapMachineUnitDetail(
  machine: MachineUnitApiItem,
  workflow: WorkflowApiItem,
): MachineUnitDetail {
  return {
    id: machine.id,
    unitCode: machine.id,
    orderId: machine.orderNumber,
    customer: machine.customerName,
    destination: machine.destination,
    scheduledFor: formatSchedule(machine.scheduledFor),
    productName: machine.productName,
    serialNumber: machine.serialNumber,
    qrReady: Boolean(machine.qrCodeValue),
    mediaComplete: machine.imageCount >= 1 && machine.videoCount >= machine.requiredVideoCount,
    workflowStage: mapWorkflowStage(workflow.nextStage),
    photos: machine.imageCount,
    videos: machine.videoCount,
    requiredVideos: machine.requiredVideoCount,
    dispatchedAt: machine.dispatchedAt,
    dispatchNotes: machine.dispatchNotes,
    mediaFiles: machine.mediaFiles.map((file) => ({
      id: file.id,
      kind: file.kind,
      fileName: file.fileName,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
    })),
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore invalid JSON and keep the status-based message.
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboardOrders(): Promise<DispatchOrder[]> {
  const payload = await fetchJson<{ data: OrdersApiItem[] }>('/orders');
  return payload.data.map(mapOrderToDispatchOrder);
}

export async function fetchMachineUnitById(id: string): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}`);
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function generateSerialForMachineUnit(id: string): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/generate-serial`, {
    method: 'POST',
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function generateQrForMachineUnit(id: string): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/generate-qr`, {
    method: 'POST',
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function updateMachineWorkflowStage(
  id: string,
  workflowStage: 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH' | 'DISPATCHED',
): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ workflowStage }),
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function markMachineUnitDispatched(
  id: string,
  dispatchNotes?: string,
): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(dispatchNotes ? { dispatchNotes } : {}),
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function uploadMediaToMachineUnit(
  id: string,
  input: { kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; file: File },
): Promise<MachineUnitDetail> {
  const formData = new FormData();
  formData.set('kind', input.kind);
  formData.set('file', input.file);

  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/media/upload`, {
    method: 'POST',
    body: formData,
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}

export async function deleteMedia(mediaId: string): Promise<MachineUnitDetail> {
  const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/media/${mediaId}`, {
    method: 'DELETE',
  });
  return mapMachineUnitDetail(payload.data, payload.workflow);
}
