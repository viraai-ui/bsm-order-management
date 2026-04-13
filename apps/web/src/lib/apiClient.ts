export type DispatchBucket = 'Urgent' | 'Today' | 'Tomorrow' | 'Later';

export type DispatchOrder = {
  id: string;
  customer: string;
  destination: string;
  scheduledFor: string;
  bucket: DispatchBucket;
  status: 'Awaiting media' | 'Ready to pack' | 'Testing complete' | 'Dispatch ready';
  priority: 'High' | 'Medium' | 'Normal';
};

export const dashboardSnapshot: DispatchOrder[] = [
  {
    id: 'BSM-24018',
    customer: 'Anand Cooling Towers',
    destination: 'Delhi NCR',
    scheduledFor: '08:30 today',
    bucket: 'Urgent',
    status: 'Awaiting media',
    priority: 'High',
  },
  {
    id: 'BSM-24021',
    customer: 'Shiv Pumps',
    destination: 'Jaipur',
    scheduledFor: '13:00 today',
    bucket: 'Today',
    status: 'Testing complete',
    priority: 'Medium',
  },
  {
    id: 'BSM-24025',
    customer: 'Northline Infra',
    destination: 'Lucknow',
    scheduledFor: '10:00 tomorrow',
    bucket: 'Tomorrow',
    status: 'Ready to pack',
    priority: 'Normal',
  },
  {
    id: 'BSM-24029',
    customer: 'Hydrotech Systems',
    destination: 'Chandigarh',
    scheduledFor: 'Wednesday',
    bucket: 'Later',
    status: 'Dispatch ready',
    priority: 'Normal',
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
