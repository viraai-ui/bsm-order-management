import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MachineUnitPage } from '../pages/MachineUnitPage';

function renderWithRoutes(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/machine-units/:id" element={<MachineUnitPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

type MachineRecord = {
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
  mediaFiles: Array<{
    id: string;
    machineUnitId: string;
    kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName: string;
    storagePath: string;
    mimeType: string | null;
    createdAt: string;
  }>;
};

const ordersPayload = [
  {
    id: '1',
    salesOrderNumber: 'BSM-24018',
    customerName: 'Anand Cooling Towers',
    deliveryDate: '2026-04-13T08:30:00Z',
    destination: 'Delhi NCR',
    status: 'Awaiting media',
    machineUnits: [{ id: 'MU-24018-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 }],
  },
  {
    id: '2',
    salesOrderNumber: 'BSM-24021',
    customerName: 'Shiv Pumps',
    deliveryDate: '2026-04-13T13:00:00Z',
    destination: 'Jaipur',
    status: 'Dispatch ready',
    machineUnits: [{ id: 'MU-24021-1', zohoLineItemId: 'line-2', productName: 'Pressure Pump Assembly', quantity: 1 }],
  },
  {
    id: '3',
    salesOrderNumber: 'BSM-24025',
    customerName: 'Northline Infra',
    deliveryDate: '2026-04-14T10:00:00Z',
    destination: 'Lucknow',
    status: 'Testing complete',
    machineUnits: [{ id: 'MU-24025-1', zohoLineItemId: 'line-3', productName: 'Cooling Tower Frame', quantity: 1 }],
  },
  {
    id: '4',
    salesOrderNumber: 'BSM-24029',
    customerName: 'Hydrotech Systems',
    deliveryDate: '2026-04-16T09:00:00Z',
    destination: 'Chandigarh',
    status: 'Dispatched',
    machineUnits: [{ id: 'MU-24029-1', zohoLineItemId: 'line-4', productName: 'Heat Exchange Module', quantity: 1 }],
  },
] as const;

function createMachineRecord(overrides: Partial<MachineRecord> & Pick<MachineRecord, 'id' | 'orderNumber' | 'customerName' | 'destination' | 'productName'>): MachineRecord {
  const { id, orderNumber, customerName, destination, productName, ...rest } = overrides;

  return {
    id,
    orderId: `order-${id}`,
    orderNumber,
    customerName,
    destination,
    scheduledFor: '2026-04-13T08:30:00Z',
    productName,
    serialNumber: null,
    qrCodeValue: null,
    imageCount: 1,
    videoCount: 0,
    requiredVideoCount: 2,
    workflowStage: 'PACKING_TESTING',
    dispatchedAt: null,
    dispatchNotes: null,
    mediaFiles: [
      {
        id: 'media-1',
        machineUnitId: id,
        kind: 'IMAGE',
        fileName: 'packing-photo-1.jpg',
        storagePath: 'seed/packing-photo-1.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2026-04-13T08:30:00Z',
      },
    ],
    ...rest,
  };
}

function buildWorkflow(machine: MachineRecord) {
  if (machine.workflowStage === 'DISPATCHED') {
    return { dispatchReady: false, nextStage: 'DISPATCHED' as const };
  }

  const dispatchReady = Boolean(machine.serialNumber) && Boolean(machine.qrCodeValue) && machine.imageCount >= 1 && machine.videoCount >= machine.requiredVideoCount;

  return {
    dispatchReady,
    nextStage: dispatchReady
      ? 'READY_FOR_DISPATCH'
      : machine.imageCount >= 1 && machine.videoCount >= machine.requiredVideoCount
        ? 'MEDIA_UPLOADED'
        : 'PACKING_TESTING',
  };
}

let machineUnits: Record<string, MachineRecord>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  machineUnits = {
    'MU-24018-1': createMachineRecord({
      id: 'MU-24018-1',
      orderNumber: 'BSM-24018',
      customerName: 'Anand Cooling Towers',
      destination: 'Delhi NCR',
      productName: 'Axial Fan Unit',
    }),
    'MU-24021-1': createMachineRecord({
      id: 'MU-24021-1',
      orderNumber: 'BSM-24021',
      customerName: 'Shiv Pumps',
      destination: 'Jaipur',
      productName: 'Pressure Pump Assembly',
      serialNumber: '262700014',
      qrCodeValue: 'qr://262700014',
      imageCount: 4,
      videoCount: 2,
      workflowStage: 'READY_FOR_DISPATCH',
      mediaFiles: [
        {
          id: 'media-ready-photo',
          machineUnitId: 'MU-24021-1',
          kind: 'IMAGE',
          fileName: 'ready-photo.jpg',
          storagePath: 'seed/ready-photo.jpg',
          mimeType: 'image/jpeg',
          createdAt: '2026-04-13T08:30:00Z',
        },
      ],
    }),
  };

  fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/orders')) {
      return {
        ok: true,
        json: async () => ({ data: ordersPayload }),
      };
    }

    const machineIdMatch = url.match(/\/machine-units\/([^/]+)/);
    const machineId = machineIdMatch?.[1];

    if (machineId && !init?.method) {
      const machine = machineUnits[machineId];
      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (url.endsWith('/generate-serial')) {
      const machine = machineUnits['MU-24018-1'];
      machine.serialNumber = '262700025';
      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (url.endsWith('/generate-qr')) {
      const machine = machineUnits['MU-24018-1'];

      if (!machine.serialNumber) {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'Serial number must exist before generating a QR code' }),
        };
      }

      machine.qrCodeValue = `qr://${machine.serialNumber}`;
      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (url.endsWith('/media/upload') && init?.method === 'POST' && machineId) {
      const body = init.body as FormData;
      const file = body.get('file') as File;
      const kind = body.get('kind') as 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      const machine = machineUnits[machineId];
      const mediaId = `media-${machine.mediaFiles.length + 1}`;
      machine.mediaFiles.push({
        id: mediaId,
        machineUnitId: machineId,
        kind,
        fileName: file.name,
        storagePath: `uploads/${file.name}`,
        mimeType: file.type,
        createdAt: '2026-04-13T08:35:00Z',
      });
      if (kind === 'IMAGE') machine.imageCount += 1;
      if (kind === 'VIDEO') machine.videoCount += 1;
      if (kind === 'DOCUMENT') machine.workflowStage = 'MEDIA_UPLOADED';

      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (url.includes('/media/') && init?.method === 'DELETE') {
      const mediaId = url.split('/media/')[1];
      const machine = machineUnits['MU-24018-1'];
      const media = machine.mediaFiles.find((file) => file.id === mediaId);
      if (media?.kind === 'IMAGE') machine.imageCount -= 1;
      if (media?.kind === 'VIDEO') machine.videoCount -= 1;
      machine.mediaFiles = machine.mediaFiles.filter((file) => file.id !== mediaId);

      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (url.endsWith('/dispatch') && init?.method === 'POST' && machineId) {
      const machine = machineUnits[machineId];
      const payload = JSON.parse(String(init.body ?? '{}')) as { dispatchNotes?: string };
      machine.workflowStage = 'DISPATCHED';
      machine.dispatchedAt = '2026-04-15T11:30:00.000Z';
      machine.dispatchNotes = payload.dispatchNotes ?? null;

      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    if (init?.method === 'PATCH' && machineId) {
      const machine = machineUnits[machineId];
      const payload = JSON.parse(String(init.body ?? '{}')) as { workflowStage?: MachineRecord['workflowStage'] };
      if (payload.workflowStage) {
        machine.workflowStage = payload.workflowStage;
      }
      return {
        ok: true,
        json: async () => ({ data: machine, workflow: buildWorkflow(machine) }),
      };
    }

    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });

  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dashboard detail flow', () => {
  it('renders buckets and hides dispatched units by default', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/dashboard']);

    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(await screen.findByText('BSM-24018')).toBeInTheDocument();
    expect(screen.queryByText('BSM-24029')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Active only' }));

    expect(await screen.findByText('BSM-24029')).toBeInTheDocument();
  });

  it('filters the dashboard by blocked and ready units', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/dashboard']);

    expect(await screen.findByText('BSM-24018')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Blocked' }));

    expect(screen.getByText('BSM-24018')).toBeInTheDocument();
    expect(screen.getByText('BSM-24025')).toBeInTheDocument();
    expect(screen.queryByText('BSM-24021')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ready' }));

    expect(screen.getByText('BSM-24021')).toBeInTheDocument();
    expect(screen.queryByText('BSM-24018')).not.toBeInTheDocument();
  });

  it('shows an API error on machine detail actions instead of silently falling back', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('Generate serial')).toBeInTheDocument();

    await user.click(screen.getByText('Generate QR'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Serial number must exist before generating a QR code');
  });

  it('uploads and removes media from the machine unit view with multipart form data', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('packing-photo-1.jpg')).toBeInTheDocument();

    const file = new File(['video-proof'], 'test-run.mp4', { type: 'video/mp4' });
    await user.upload(screen.getByLabelText('Choose file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload media' }));

    await waitFor(() => {
      expect(screen.getByText('test-run.mp4')).toBeInTheDocument();
      expect(screen.getByLabelText('Videos count')).toHaveTextContent('1');
    });

    const uploadCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/machine-units/MU-24018-1/media/upload'));
    expect(uploadCall?.[1]?.body).toBeInstanceOf(FormData);

    await user.click(screen.getByRole('button', { name: 'Remove test-run.mp4' }));

    await waitFor(() => {
      expect(screen.queryByText('test-run.mp4')).not.toBeInTheDocument();
    });
  });

  it('marks a ready machine as dispatched from the detail page', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24021-1']);

    expect(await screen.findByLabelText('Dispatch notes')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Dispatch notes'), 'Handed to carrier at dock 2');
    await user.click(screen.getByRole('button', { name: 'Mark dispatched' }));

    await waitFor(() => {
      expect(screen.getAllByText('Dispatched').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Dispatch completed' })).toBeDisabled();
    });

    const dispatchCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/machine-units/MU-24021-1/dispatch'));
    expect(dispatchCall?.[1]?.method).toBe('POST');
    expect(dispatchCall?.[1]?.body).toBe(JSON.stringify({ dispatchNotes: 'Handed to carrier at dock 2' }));
  });
});
