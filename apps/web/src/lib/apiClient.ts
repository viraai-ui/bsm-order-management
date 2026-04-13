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

export function getMachineUnitById(id: string) {
  return machineUnitSnapshot.find((machine) => machine.id === id) ?? null;
}
