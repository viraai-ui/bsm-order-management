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
});
