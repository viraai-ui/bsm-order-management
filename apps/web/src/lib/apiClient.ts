export type DispatchBucket = 'Urgent' | 'Today' | 'Tomorrow' | 'Later';

export type DispatchOrder = {
  id: string;
  machineUnitId: string;
  customer: string;
  destination: string;
  scheduledFor: string;
  bucket: DispatchBucket;
  status: 'Awaiting media' | 'Ready to pack' | 'Testing complete' | 'Dispatch ready';
  priority: 'High' | 'Medium' | 'Normal';
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
  workflowStage: 'Packing / Testing' | 'Media Uploaded' | 'Ready for Dispatch';
  photos: number;
  videos: number;
  requiredVideos: number;
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
  workflowStage: 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH';
};

type WorkflowApiItem = {
  dispatchReady: boolean;
  nextStage: 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH';
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export const dashboardSnapshot: DispatchOrder[] = [
  {
    id: 'BSM-24018',
    machineUnitId: 'MU-24018-1',
    customer: 'Anand Cooling Towers',
    destination: 'Delhi NCR',
    scheduledFor: '08:30 today',
    bucket: 'Urgent',
    status: 'Awaiting media',
    priority: 'High',
  },
  {
    id: 'BSM-24021',
    machineUnitId: 'MU-24021-1',
    customer: 'Shiv Pumps',
    destination: 'Jaipur',
    scheduledFor: '13:00 today',
    bucket: 'Today',
    status: 'Testing complete',
    priority: 'Medium',
  },
  {
    id: 'BSM-24025',
    machineUnitId: 'MU-24025-1',
    customer: 'Northline Infra',
    destination: 'Lucknow',
    scheduledFor: '10:00 tomorrow',
    bucket: 'Tomorrow',
    status: 'Ready to pack',
    priority: 'Normal',
  },
  {
    id: 'BSM-24029',
    machineUnitId: 'MU-24029-1',
    customer: 'Hydrotech Systems',
    destination: 'Chandigarh',
    scheduledFor: 'Wednesday',
    bucket: 'Later',
    status: 'Dispatch ready',
    priority: 'Normal',
  },
];

export const machineUnitSnapshot: MachineUnitDetail[] = [
  {
    id: 'MU-24018-1',
    unitCode: 'MU-24018-1',
    orderId: 'BSM-24018',
    customer: 'Anand Cooling Towers',
    destination: 'Delhi NCR',
    scheduledFor: '08:30 today',
    productName: 'Axial Fan Unit',
    serialNumber: null,
    qrReady: false,
    mediaComplete: false,
    workflowStage: 'Packing / Testing',
    photos: 4,
    videos: 0,
    requiredVideos: 2,
  },
  {
    id: 'MU-24021-1',
    unitCode: 'MU-24021-1',
    orderId: 'BSM-24021',
    customer: 'Shiv Pumps',
    destination: 'Jaipur',
    scheduledFor: '13:00 today',
    productName: 'Pressure Pump Assembly',
    serialNumber: '262700014',
    qrReady: true,
    mediaComplete: true,
    workflowStage: 'Ready for Dispatch',
    photos: 6,
    videos: 2,
    requiredVideos: 2,
  },
  {
    id: 'MU-24025-1',
    unitCode: 'MU-24025-1',
    orderId: 'BSM-24025',
    customer: 'Northline Infra',
    destination: 'Lucknow',
    scheduledFor: '10:00 tomorrow',
    productName: 'Cooling Tower Frame',
    serialNumber: '262700019',
    qrReady: false,
    mediaComplete: false,
    workflowStage: 'Media Uploaded',
    photos: 5,
    videos: 2,
    requiredVideos: 2,
  },
  {
    id: 'MU-24029-1',
    unitCode: 'MU-24029-1',
    orderId: 'BSM-24029',
    customer: 'Hydrotech Systems',
    destination: 'Chandigarh',
    scheduledFor: 'Wednesday',
    productName: 'Heat Exchange Module',
    serialNumber: '262700024',
    qrReady: true,
    mediaComplete: false,
    workflowStage: 'Media Uploaded',
    photos: 3,
    videos: 1,
    requiredVideos: 2,
  },
];

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
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboardOrders(): Promise<DispatchOrder[]> {
  try {
    const payload = await fetchJson<{ data: OrdersApiItem[] }>('/orders');
    return payload.data.map(mapOrderToDispatchOrder);
  } catch {
    return dashboardSnapshot;
  }
}

export async function fetchMachineUnitById(id: string): Promise<MachineUnitDetail | null> {
  try {
    const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}`);
    return mapMachineUnitDetail(payload.data, payload.workflow);
  } catch {
    return machineUnitSnapshot.find((machine) => machine.id === id) ?? null;
  }
}

export async function generateSerialForMachineUnit(id: string): Promise<MachineUnitDetail | null> {
  try {
    const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/generate-serial`, {
      method: 'POST',
    });
    return mapMachineUnitDetail(payload.data, payload.workflow);
  } catch {
    const existing = machineUnitSnapshot.find((machine) => machine.id === id);
    return existing
      ? {
          ...existing,
          serialNumber: existing.serialNumber ?? '262700025',
        }
      : null;
  }
}

export async function generateQrForMachineUnit(id: string): Promise<MachineUnitDetail | null> {
  try {
    const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}/generate-qr`, {
      method: 'POST',
    });
    return mapMachineUnitDetail(payload.data, payload.workflow);
  } catch {
    const existing = machineUnitSnapshot.find((machine) => machine.id === id);
    return existing && existing.serialNumber ? { ...existing, qrReady: true } : existing ?? null;
  }
}

export async function markMachineUnitReadyForDispatch(id: string): Promise<MachineUnitDetail | null> {
  try {
    const payload = await fetchJson<{ data: MachineUnitApiItem; workflow: WorkflowApiItem }>(`/machine-units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ workflowStage: 'READY_FOR_DISPATCH' }),
    });
    return mapMachineUnitDetail(payload.data, payload.workflow);
  } catch {
    const existing = machineUnitSnapshot.find((machine) => machine.id === id);
    return existing && existing.serialNumber && existing.qrReady && existing.mediaComplete
      ? { ...existing, workflowStage: 'Ready for Dispatch' }
      : existing ?? null;
  }
}

export function getMachineUnitById(id: string) {
  return machineUnitSnapshot.find((machine) => machine.id === id) ?? null;
}
