export type DispatchBucket = 'Urgent' | 'Today' | 'Tomorrow' | 'Later';
export type DispatchStatus = 'Awaiting media' | 'Ready to pack' | 'Testing complete' | 'Dispatch ready' | 'Dispatched';
export type TeamAssignment = 'TEAM_A' | 'TEAM_B';
export type WorkflowStageCode = 'PACKING_TESTING' | 'MEDIA_UPLOADED' | 'READY_FOR_DISPATCH' | 'DISPATCHED';

export type DispatchOrder = {
  id: string;
  machineUnitId: string;
  customer: string;
  destination: string;
  scheduledFor: string;
  bucket: DispatchBucket;
  status: DispatchStatus;
  priority: 'High' | 'Medium' | 'Normal';
};

export type MediaRecord = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  fileName: string;
  mimeType: string | null;
  createdAt: string;
  publicUrl?: string | null;
  sizeBytes?: number | null;
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
  qrCodeValue: string | null;
  qrReady: boolean;
  mediaComplete: boolean;
  workflowStage: 'Packing / Testing' | 'Media Uploaded' | 'Ready for Dispatch' | 'Dispatched';
  workflowCode?: WorkflowStageCode;
  photos: number;
  videos: number;
  requiredVideos: number;
  mediaFiles: MediaRecord[];
  dispatchedAt?: string | null;
  dispatchNotes?: string | null;
};

export type OrderMachineSummary = {
  id: string;
  zohoLineItemId: string;
  productName: string;
  quantity: number;
  sku: string | null;
  serialNumber: string | null;
  qrCodeValue: string | null;
  qrReady: boolean;
  imageCount: number;
  videoCount: number;
  requiredVideoCount: number;
  mediaComplete: boolean;
  workflowStage: MachineUnitDetail['workflowStage'];
  workflowCode: WorkflowStageCode;
  mediaFiles: MediaRecord[];
};

export type OrderSummary = {
  id: string;
  salesOrderNumber: string;
  externalRef: string | null;
  customerName: string;
  customerEmail: string | null;
  deliveryDate: string | null;
  deliveryLabel: string;
  destination: string;
  status: DispatchStatus;
  teamAssignment: TeamAssignment | null;
  assignedAt: string | null;
  machineUnitCount: number;
  totalQuantity: number;
  imageCount: number;
  videoCount: number;
  requiredVideoCount: number;
  serialNumberCount: number;
  qrCodeCount: number;
  machineUnits: OrderMachineSummary[];
};

export type OrderDetail = OrderSummary & {
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  workflowSummary: {
    awaitingMediaCount: number;
    mediaUploadedCount: number;
    readyForDispatchCount: number;
    dispatchedCount: number;
  };
};

export type DispatchOrdersByTeam = Record<TeamAssignment, OrderSummary[]>;

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active';
};

export type SyncLogRecord = {
  id: string;
  source: string;
  status: 'Success' | 'Pending' | 'Blocked';
  summary: string;
  happenedAt: string;
};

type OrdersApiItem = {
  id?: string;
  salesOrderNumber?: string;
  externalRef?: string | null;
  customerName?: string;
  customerEmail?: string | null;
  deliveryDate?: string | null;
  dueDate?: string | null;
  destination?: string;
  status?: string;
  teamAssignment?: TeamAssignment | null;
  assignedAt?: string | null;
  machineUnitCount?: number;
  totalQuantity?: number;
  imageCount?: number;
  videoCount?: number;
  requiredVideoCount?: number;
  serialNumberCount?: number;
  qrCodeCount?: number;
  machineUnits?: Array<Record<string, unknown>>;
};

type OrderDetailApiItem = OrdersApiItem & {
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  workflowSummary?: {
    awaitingMediaCount?: number;
    mediaUploadedCount?: number;
    readyForDispatchCount?: number;
    dispatchedCount?: number;
  };
};

type MachineUnitApiItem = {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  destination?: string;
  scheduledFor?: string | null;
  productName?: string;
  serialNumber?: string | null;
  qrCodeValue?: string | null;
  imageCount?: number;
  videoCount?: number;
  requiredVideoCount?: number;
  workflowStage?: WorkflowStageCode;
  dispatchedAt?: string | null;
  dispatchNotes?: string | null;
  mediaFiles?: Array<{
    id: string;
    machineUnitId?: string;
    kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName: string;
    storagePath?: string;
    mimeType?: string | null;
    publicUrl?: string | null;
    sizeBytes?: number | null;
    createdAt: string;
  }>;
};

type WorkflowApiItem = {
  dispatchReady?: boolean;
  nextStage?: WorkflowStageCode;
};

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;

  if (import.meta.env.PROD) {
    return 'https://pure-gentleness-production.up.railway.app';
  }

  return 'http://localhost:3001';
}

const API_BASE_URL = resolveApiBaseUrl();

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

function mapWorkflowStage(nextStage: WorkflowStageCode | undefined): MachineUnitDetail['workflowStage'] {
  if (nextStage === 'DISPATCHED') return 'Dispatched';
  if (nextStage === 'READY_FOR_DISPATCH') return 'Ready for Dispatch';
  if (nextStage === 'MEDIA_UPLOADED') return 'Media Uploaded';
  return 'Packing / Testing';
}

function normalizeDispatchStatus(value: unknown): DispatchStatus {
  if (value === 'Dispatch ready' || value === 'READY_FOR_DISPATCH') return 'Dispatch ready';
  if (value === 'Dispatched' || value === 'DISPATCHED') return 'Dispatched';
  if (value === 'Testing complete' || value === 'MEDIA_UPLOADED') return 'Testing complete';
  if (value === 'Ready to pack') return 'Ready to pack';
  return 'Awaiting media';
}

function normalizeWorkflowCode(value: unknown): WorkflowStageCode {
  if (value === 'DISPATCHED') return 'DISPATCHED';
  if (value === 'READY_FOR_DISPATCH') return 'READY_FOR_DISPATCH';
  if (value === 'MEDIA_UPLOADED') return 'MEDIA_UPLOADED';
  return 'PACKING_TESTING';
}

function normalizeMediaRecord(file: Record<string, unknown>): MediaRecord {
  return {
    id: String(file.id ?? crypto.randomUUID()),
    kind: (file.kind === 'VIDEO' || file.kind === 'DOCUMENT' ? file.kind : 'IMAGE') as MediaRecord['kind'],
    fileName: String(file.fileName ?? 'Unnamed file'),
    mimeType: typeof file.mimeType === 'string' ? file.mimeType : null,
    createdAt: typeof file.createdAt === 'string' ? file.createdAt : new Date(0).toISOString(),
    publicUrl: typeof file.publicUrl === 'string' ? file.publicUrl : null,
    sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
  };
}

function normalizeMachineSummary(machine: Record<string, unknown>, index: number): OrderMachineSummary {
  const mediaFiles = Array.isArray(machine.mediaFiles)
    ? machine.mediaFiles.map((file) => normalizeMediaRecord(file as Record<string, unknown>))
    : [];
  const imageCount = typeof machine.imageCount === 'number'
    ? machine.imageCount
    : mediaFiles.filter((file) => file.kind === 'IMAGE').length;
  const videoCount = typeof machine.videoCount === 'number'
    ? machine.videoCount
    : mediaFiles.filter((file) => file.kind === 'VIDEO').length;
  const requiredVideoCount = typeof machine.requiredVideoCount === 'number' ? machine.requiredVideoCount : 0;
  const workflowCode = normalizeWorkflowCode(machine.workflowStage);
  const serialNumber = typeof machine.serialNumber === 'string' ? machine.serialNumber : null;
  const qrCodeValue = typeof machine.qrCodeValue === 'string' ? machine.qrCodeValue : null;
  const qrReady = Boolean(qrCodeValue) || (typeof machine.qrCodeCount === 'number' && machine.qrCodeCount > 0);

  return {
    id: String(machine.id ?? `machine-${index + 1}`),
    zohoLineItemId: String(machine.zohoLineItemId ?? machine.id ?? `line-${index + 1}`),
    productName: String(machine.productName ?? machine.name ?? `Machine ${index + 1}`),
    quantity: typeof machine.quantity === 'number' ? machine.quantity : 1,
    sku: typeof machine.sku === 'string' ? machine.sku : null,
    serialNumber,
    qrCodeValue,
    qrReady,
    imageCount,
    videoCount,
    requiredVideoCount,
    mediaComplete: imageCount >= 1 && videoCount >= requiredVideoCount,
    workflowStage: mapWorkflowStage(workflowCode),
    workflowCode,
    mediaFiles,
  };
}

function mapOrderRecord(order: OrdersApiItem): OrderSummary {
  const salesOrderNumber = String(order.salesOrderNumber ?? order.id ?? 'Unknown');
  const machineUnits = Array.isArray(order.machineUnits)
    ? order.machineUnits.map((machine, index) => normalizeMachineSummary(machine, index))
    : [];
  const machineUnitCount = typeof order.machineUnitCount === 'number' ? order.machineUnitCount : machineUnits.length;
  const totalQuantity = typeof order.totalQuantity === 'number'
    ? order.totalQuantity
    : machineUnits.reduce((sum, machineUnit) => sum + machineUnit.quantity, 0);
  const imageCount = typeof order.imageCount === 'number'
    ? order.imageCount
    : machineUnits.reduce((sum, machineUnit) => sum + machineUnit.imageCount, 0);
  const videoCount = typeof order.videoCount === 'number'
    ? order.videoCount
    : machineUnits.reduce((sum, machineUnit) => sum + machineUnit.videoCount, 0);
  const requiredVideoCount = typeof order.requiredVideoCount === 'number'
    ? order.requiredVideoCount
    : machineUnits.reduce((sum, machineUnit) => sum + machineUnit.requiredVideoCount, 0);
  const serialNumberCount = typeof order.serialNumberCount === 'number'
    ? order.serialNumberCount
    : machineUnits.filter((machineUnit) => machineUnit.serialNumber).length;
  const qrCodeCount = typeof order.qrCodeCount === 'number'
    ? order.qrCodeCount
    : machineUnits.filter((machineUnit) => machineUnit.qrReady).length;
  const deliveryDate = typeof order.deliveryDate === 'string'
    ? order.deliveryDate
    : typeof order.dueDate === 'string'
      ? order.dueDate
      : null;

  return {
    id: String(order.id ?? salesOrderNumber),
    salesOrderNumber,
    externalRef: typeof order.externalRef === 'string' ? order.externalRef : null,
    customerName: String(order.customerName ?? 'Unknown customer'),
    customerEmail: typeof order.customerEmail === 'string' ? order.customerEmail : null,
    deliveryDate,
    deliveryLabel: formatSchedule(deliveryDate),
    destination: String(order.destination ?? 'TBD'),
    status: normalizeDispatchStatus(order.status),
    teamAssignment: order.teamAssignment ?? null,
    assignedAt: typeof order.assignedAt === 'string' ? order.assignedAt : null,
    machineUnitCount,
    totalQuantity,
    imageCount,
    videoCount,
    requiredVideoCount,
    serialNumberCount,
    qrCodeCount,
    machineUnits,
  };
}

function mapOrderDetailRecord(order: OrderDetailApiItem): OrderDetail {
  const summary = mapOrderRecord(order);

  return {
    ...summary,
    notes: typeof order.notes === 'string' ? order.notes : null,
    createdAt: typeof order.createdAt === 'string' ? order.createdAt : null,
    updatedAt: typeof order.updatedAt === 'string' ? order.updatedAt : null,
    workflowSummary: {
      awaitingMediaCount: typeof order.workflowSummary?.awaitingMediaCount === 'number'
        ? order.workflowSummary.awaitingMediaCount
        : summary.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'PACKING_TESTING').length,
      mediaUploadedCount: typeof order.workflowSummary?.mediaUploadedCount === 'number'
        ? order.workflowSummary.mediaUploadedCount
        : summary.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'MEDIA_UPLOADED').length,
      readyForDispatchCount: typeof order.workflowSummary?.readyForDispatchCount === 'number'
        ? order.workflowSummary.readyForDispatchCount
        : summary.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'READY_FOR_DISPATCH').length,
      dispatchedCount: typeof order.workflowSummary?.dispatchedCount === 'number'
        ? order.workflowSummary.dispatchedCount
        : summary.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'DISPATCHED').length,
    },
  };
}

export function mapOrderToDispatchOrder(order: OrdersApiItem, index: number): DispatchOrder {
  const mappedOrder = mapOrderRecord(order);
  const machine = mappedOrder.machineUnits[0];

  return {
    id: mappedOrder.salesOrderNumber,
    machineUnitId: machine?.id ?? `MU-${index + 1}`,
    customer: mappedOrder.customerName,
    destination: mappedOrder.destination,
    scheduledFor: mappedOrder.deliveryLabel,
    bucket: mapScheduleToBucket(mappedOrder.deliveryDate),
    status: mappedOrder.status,
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Normal',
  };
}

export function mapMachineUnitDetail(
  machine: MachineUnitApiItem,
  workflow: WorkflowApiItem = {},
): MachineUnitDetail {
  const workflowCode = normalizeWorkflowCode(workflow.nextStage ?? machine.workflowStage);
  const mediaFiles = (machine.mediaFiles ?? []).map((file) => ({
    id: file.id,
    kind: file.kind,
    fileName: file.fileName,
    mimeType: file.mimeType ?? null,
    createdAt: file.createdAt,
    publicUrl: file.publicUrl ?? null,
    sizeBytes: file.sizeBytes ?? null,
  }));

  return {
    id: machine.id,
    unitCode: machine.id,
    orderId: machine.orderNumber ?? machine.orderId ?? 'Unknown order',
    customer: machine.customerName ?? 'Unknown customer',
    destination: machine.destination ?? 'TBD',
    scheduledFor: formatSchedule(machine.scheduledFor),
    productName: machine.productName ?? 'Machine unit',
    serialNumber: machine.serialNumber ?? null,
    qrCodeValue: machine.qrCodeValue ?? null,
    qrReady: Boolean(machine.qrCodeValue),
    mediaComplete: (machine.imageCount ?? 0) >= 1 && (machine.videoCount ?? 0) >= (machine.requiredVideoCount ?? 0),
    workflowStage: mapWorkflowStage(workflowCode),
    workflowCode,
    photos: machine.imageCount ?? mediaFiles.filter((file) => file.kind === 'IMAGE').length,
    videos: machine.videoCount ?? mediaFiles.filter((file) => file.kind === 'VIDEO').length,
    requiredVideos: machine.requiredVideoCount ?? 0,
    dispatchedAt: machine.dispatchedAt,
    dispatchNotes: machine.dispatchNotes,
    mediaFiles,
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

async function fetchJsonOptional<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await fetchJson<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return null;
    }
    throw error;
  }
}

export async function login(input: { email: string; password: string }) {
  const payload = await fetchJson<{ user: { id: string; email: string; name: string; role: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload.user;
}

export async function fetchCurrentUser() {
  const payload = await fetchJson<{ user: { id: string; email: string; name: string; role: string } }>('/auth/me');
  return payload.user;
}

export async function logout() {
  await fetchJson<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function fetchDashboardOrders(): Promise<DispatchOrder[]> {
  const payload = await fetchJson<{ data: OrdersApiItem[] }>('/orders');
  return payload.data.map(mapOrderToDispatchOrder);
}

export async function fetchOrders(input?: { teamAssignment?: TeamAssignment | null }): Promise<OrderSummary[]> {
  const query = input?.teamAssignment ? `?teamAssignment=${input.teamAssignment}` : '';
  const payload = await fetchJson<{ data: OrdersApiItem[] }>(`/orders${query}`);
  return payload.data.map(mapOrderRecord);
}

function toFallbackOrderDetail(order: OrderSummary): OrderDetail {
  return {
    ...order,
    notes: null,
    createdAt: null,
    updatedAt: null,
    workflowSummary: {
      awaitingMediaCount: order.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'PACKING_TESTING').length,
      mediaUploadedCount: order.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'MEDIA_UPLOADED').length,
      readyForDispatchCount: order.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'READY_FOR_DISPATCH').length,
      dispatchedCount: order.machineUnits.filter((machineUnit) => machineUnit.workflowCode === 'DISPATCHED').length,
    },
  };
}

export async function fetchOrderById(id: string): Promise<OrderDetail> {
  const payload = await fetchJsonOptional<{ data: OrderDetailApiItem }>(`/orders/${id}`);
  if (payload?.data) {
    return mapOrderDetailRecord(payload.data);
  }

  const orders = await fetchOrders();
  const order = orders.find((item) => item.id === id || item.salesOrderNumber === id);
  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  return toFallbackOrderDetail(order);
}

export async function updateOrderTeamAssignment(id: string, teamAssignment: TeamAssignment): Promise<OrderDetail> {
  const payload = await fetchJson<{ data: OrderDetailApiItem }>(`/orders/${id}/team-assignment`, {
    method: 'PATCH',
    body: JSON.stringify({ teamAssignment }),
  });
  return mapOrderDetailRecord(payload.data);
}

export async function generateQrsForOrder(id: string): Promise<OrderDetail> {
  const payload = await fetchJson<{ data: OrderDetailApiItem }>(`/orders/${id}/generate-qrs`, {
    method: 'POST',
  });
  return mapOrderDetailRecord(payload.data);
}

export async function fetchDispatchOrdersByTeam(): Promise<DispatchOrdersByTeam> {
  const payload = await fetchJsonOptional<{ data: Partial<Record<TeamAssignment, OrdersApiItem[]>> }>('/orders/dispatch');
  if (payload?.data?.TEAM_A || payload?.data?.TEAM_B) {
    return {
      TEAM_A: (payload.data.TEAM_A ?? []).map(mapOrderRecord),
      TEAM_B: (payload.data.TEAM_B ?? []).map(mapOrderRecord),
    };
  }

  const orders = await fetchOrders();
  return {
    TEAM_A: orders.filter((order) => order.teamAssignment === 'TEAM_A'),
    TEAM_B: orders.filter((order) => order.teamAssignment === 'TEAM_B'),
  };
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
  workflowStage: WorkflowStageCode,
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

export async function fetchSettingsUsers(): Promise<SettingsUser[]> {
  const user = await fetchCurrentUser();
  return [{
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: 'Active',
  }];
}

export async function fetchSyncLogs(): Promise<SyncLogRecord[]> {
  const currentUser = await fetchCurrentUser();

  return [
    {
      id: 'sync-1',
      source: 'Zoho orders',
      status: 'Success',
      summary: 'Latest order snapshot imported successfully.',
      happenedAt: '2026-04-15T08:10:00Z',
    },
    {
      id: 'sync-2',
      source: 'Dispatch media',
      status: 'Pending',
      summary: `Read-only fallback until live sync logs endpoint lands. Viewed by ${currentUser.name}.`,
      happenedAt: '2026-04-15T08:07:00Z',
    },
    {
      id: 'sync-3',
      source: 'Zoho auth scope',
      status: 'Blocked',
      summary: 'Scope upgrade still pending on the backend integration.',
      happenedAt: '2026-04-15T07:58:00Z',
    },
  ];
}
