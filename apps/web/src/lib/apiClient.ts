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
  salesOrderNumber: string;
  customerName: string;
  deliveryDate?: string;
  status: string;
  machineUnits: {
    zohoLineItemId: string;
    productName: string;
  }[];
};

type MachineUnitApiItem = {
  id: string;
  orderId: string;
  productName: string;
  serialNumber: string | null;
  qrCodeValue: string | null;
  imageCount: number;
  videoCount: number;
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

function mapStatusToBucket(status: string): DispatchBucket {
  if (status.toLowerCase().includes('urgent')) return 'Urgent';
  if (status.toLowerCase().includes('ready')) return 'Today';
  return 'Today';
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
    machineUnitId: machine?.zohoLineItemId ? `MU-${order.salesOrderNumber.replace('BSM-', '')}-${index + 1}` : `MU-${index + 1}`,
    customer: order.customerName,
    destination: 'Factory dispatch lane',
    scheduledFor: order.deliveryDate ?? 'TBD',
    bucket: mapStatusToBucket(order.status),
    status: order.status.toLowerCase().includes('ready') ? 'Dispatch ready' : 'Ready to pack',
    priority: index === 0 ? 'High' : 'Normal',
  };
}

export function mapMachineUnitDetail(
  machine: MachineUnitApiItem,
  workflow: WorkflowApiItem,
): MachineUnitDetail {
  return {
    id: machine.id,
    unitCode: machine.id,
    orderId: machine.orderId,
    customer: machine.orderId,
    destination: 'Factory dispatch lane',
    scheduledFor: 'Next dispatch window',
    productName: machine.productName,
    serialNumber: machine.serialNumber,
    qrReady: Boolean(machine.qrCodeValue),
    mediaComplete: machine.imageCount >= 1 && machine.videoCount >= 2,
    workflowStage: mapWorkflowStage(workflow.nextStage),
    photos: machine.imageCount,
    videos: machine.videoCount,
    requiredVideos: 2,
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
          qrReady: true,
        }
      : null;
  }
}

export function getMachineUnitById(id: string) {
  return machineUnitSnapshot.find((machine) => machine.id === id) ?? null;
}
