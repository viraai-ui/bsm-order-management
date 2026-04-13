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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
    if (input.endsWith('/orders')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [{
            id: '1',
            salesOrderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            deliveryDate: '2026-04-13T08:30:00Z',
            destination: 'Delhi NCR',
            status: 'Awaiting media',
            machineUnits: [{ id: 'MU-24018-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 }],
          }],
        }),
      });
    }

    if (input.endsWith('/machine-units/MU-24018-1') && !init?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            id: 'MU-24018-1',
            orderId: 'order-1',
            orderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            scheduledFor: '2026-04-13T08:30:00Z',
            productName: 'Axial Fan Unit',
            serialNumber: null,
            qrCodeValue: null,
            imageCount: 4,
            videoCount: 0,
            requiredVideoCount: 2,
            workflowStage: 'PACKING_TESTING',
            mediaFiles: [
              {
                id: 'media-1',
                machineUnitId: 'MU-24018-1',
                kind: 'IMAGE',
                fileName: 'packing-photo-1.jpg',
                storagePath: 'seed/packing-photo-1.jpg',
                mimeType: 'image/jpeg',
                createdAt: '2026-04-13T08:30:00Z',
              },
            ],
          },
          workflow: {
            dispatchReady: false,
            nextStage: 'PACKING_TESTING',
          },
        }),
      });
    }

    if (input.endsWith('/machine-units/MU-24018-1/generate-serial')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            id: 'MU-24018-1',
            orderId: 'order-1',
            orderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            scheduledFor: '2026-04-13T08:30:00Z',
            productName: 'Axial Fan Unit',
            serialNumber: '262700014',
            qrCodeValue: null,
            imageCount: 4,
            videoCount: 0,
            requiredVideoCount: 2,
            workflowStage: 'PACKING_TESTING',
            mediaFiles: [],
          },
          workflow: {
            dispatchReady: false,
            nextStage: 'PACKING_TESTING',
          },
        }),
      });
    }

    if (input.endsWith('/machine-units/MU-24018-1/generate-qr')) {
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Serial number must exist before generating a QR code' }),
      });
    }

    if (input.endsWith('/machine-units/MU-24018-1') && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body ?? '{}')) as { workflowStage?: string };

      if (body.workflowStage === 'MEDIA_UPLOADED') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              id: 'MU-24018-1',
              orderId: 'order-1',
              orderNumber: 'BSM-24018',
              customerName: 'Anand Cooling Towers',
              destination: 'Delhi NCR',
              scheduledFor: '2026-04-13T08:30:00Z',
              productName: 'Axial Fan Unit',
              serialNumber: '262700014',
              qrCodeValue: 'qr-1',
              imageCount: 4,
              videoCount: 2,
              requiredVideoCount: 2,
              workflowStage: 'MEDIA_UPLOADED',
              mediaFiles: [],
            },
            workflow: {
              dispatchReady: true,
              nextStage: 'READY_FOR_DISPATCH',
            },
          }),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Machine unit is not ready for dispatch' }),
      });
    }

    if (input.endsWith('/machine-units/MU-24018-1/media') && init?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            id: 'MU-24018-1',
            orderId: 'order-1',
            orderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            scheduledFor: '2026-04-13T08:30:00Z',
            productName: 'Axial Fan Unit',
            serialNumber: null,
            qrCodeValue: null,
            imageCount: 4,
            videoCount: 1,
            requiredVideoCount: 2,
            workflowStage: 'PACKING_TESTING',
            mediaFiles: [
              {
                id: 'media-1',
                machineUnitId: 'MU-24018-1',
                kind: 'IMAGE',
                fileName: 'packing-photo-1.jpg',
                storagePath: 'seed/packing-photo-1.jpg',
                mimeType: 'image/jpeg',
                createdAt: '2026-04-13T08:30:00Z',
              },
              {
                id: 'media-2',
                machineUnitId: 'MU-24018-1',
                kind: 'VIDEO',
                fileName: 'test-run.mp4',
                storagePath: 'uploads/test-run.mp4',
                mimeType: 'video/mp4',
                createdAt: '2026-04-13T08:35:00Z',
              },
            ],
          },
          workflow: {
            dispatchReady: false,
            nextStage: 'PACKING_TESTING',
          },
        }),
      });
    }

    if (input.endsWith('/media/media-2') && init?.method === 'DELETE') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            id: 'MU-24018-1',
            orderId: 'order-1',
            orderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            scheduledFor: '2026-04-13T08:30:00Z',
            productName: 'Axial Fan Unit',
            serialNumber: null,
            qrCodeValue: null,
            imageCount: 4,
            videoCount: 0,
            requiredVideoCount: 2,
            workflowStage: 'PACKING_TESTING',
            mediaFiles: [
              {
                id: 'media-1',
                machineUnitId: 'MU-24018-1',
                kind: 'IMAGE',
                fileName: 'packing-photo-1.jpg',
                storagePath: 'seed/packing-photo-1.jpg',
                mimeType: 'image/jpeg',
                createdAt: '2026-04-13T08:30:00Z',
              },
            ],
          },
          workflow: {
            dispatchReady: false,
            nextStage: 'PACKING_TESTING',
          },
        }),
      });
    }

    return Promise.reject(new Error(`Unhandled fetch: ${input}`));
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dashboard detail flow', () => {
  it('renders all dispatch buckets on the dashboard', async () => {
    renderWithRoutes(['/dashboard']);

    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(await screen.findByText('BSM-24018')).toBeInTheDocument();
  });

  it('shows an API error on machine detail actions instead of silently falling back', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('Generate serial')).toBeInTheDocument();

    await user.click(screen.getByText('Generate QR'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Serial number must exist before generating a QR code');
  });

  it('updates machine detail after a successful action', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('Pending')).toBeInTheDocument();

    await user.click(screen.getByText('Generate serial'));

    await waitFor(() => {
      expect(screen.getByText('262700014')).toBeInTheDocument();
    });
  });

  it('adds and removes media records from the machine unit view', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('packing-photo-1.jpg')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Media type'), 'VIDEO');
    await user.type(screen.getByLabelText('File name'), 'test-run.mp4');
    await user.click(screen.getByRole('button', { name: 'Add media record' }));

    await waitFor(() => {
      expect(screen.getByText('test-run.mp4')).toBeInTheDocument();
      expect(screen.getByLabelText('Videos count')).toHaveTextContent('1');
    });

    await user.click(screen.getByRole('button', { name: 'Remove test-run.mp4' }));

    await waitFor(() => {
      expect(screen.queryByText('test-run.mp4')).not.toBeInTheDocument();
    });
  });

  it('advances the machine workflow to media uploaded', async () => {
    const user = userEvent.setup();
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(await screen.findByText('Mark ready for dispatch')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark media uploaded' }));

    await waitFor(() => {
      expect(screen.getByText('Ready for Dispatch')).toBeInTheDocument();
      expect(screen.getByText('Dispatch ready')).toBeInTheDocument();
    });
  });
});
