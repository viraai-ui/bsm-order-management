import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QrOrdersPage } from '../features/qr/QrOrdersPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QrOrdersPage', () => {
  it('hides qr-completed orders from the default active queue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'order-active',
            salesOrderNumber: 'SO-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            deliveryDate: '2026-04-13T08:30:00Z',
            status: 'Awaiting media',
            teamAssignment: 'TEAM_A',
            machineUnitCount: 2,
            qrCodeCount: 1,
            imageCount: 0,
            videoCount: 0,
            requiredVideoCount: 2,
            machineUnits: [],
          },
          {
            id: 'order-ready',
            salesOrderNumber: 'SO-24099',
            customerName: 'Northline Infra',
            destination: 'Lucknow',
            deliveryDate: '2026-04-14T08:30:00Z',
            status: 'Dispatch ready',
            teamAssignment: 'TEAM_B',
            machineUnitCount: 2,
            qrCodeCount: 2,
            imageCount: 0,
            videoCount: 0,
            requiredVideoCount: 2,
            machineUnits: [],
          },
        ],
      }),
    }));

    render(
      <MemoryRouter initialEntries={['/qr']}>
        <Routes>
          <Route path="/qr" element={<QrOrdersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('SO-24018')).toBeInTheDocument();
    expect(screen.queryByText('SO-24099')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'QR Generated' }));

    expect(await screen.findByText('SO-24099')).toBeInTheDocument();
    expect(screen.queryByText('SO-24018')).not.toBeInTheDocument();
  });

  it('shows a single QR Code Generator title with a working grid/list toggle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'order-active',
            salesOrderNumber: 'SO-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            deliveryDate: '2026-04-13T08:30:00Z',
            status: 'Awaiting media',
            machineUnitCount: 2,
            qrCodeCount: 1,
            imageCount: 0,
            videoCount: 0,
            requiredVideoCount: 2,
            machineUnits: [],
          },
        ],
      }),
    }));

    render(
      <MemoryRouter initialEntries={['/qr']}>
        <Routes>
          <Route path="/qr" element={<QrOrdersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'QR Code Generator' })).toBeInTheDocument();
    expect(screen.queryByText('Order-first QR queue')).not.toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();

    const gridToggle = screen.getByRole('button', { name: 'Grid View' });
    const listToggle = screen.getByRole('button', { name: 'List View' });
    expect(gridToggle).toHaveClass('active');
    expect(listToggle).not.toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Open QR Workflow' })).toHaveClass('premium-action-button');
    expect(screen.getByText('SO-24018').closest('article')).toHaveClass('qr-order-card--grid');

    await userEvent.click(listToggle);

    expect(listToggle).toHaveClass('active');
    expect(gridToggle).not.toHaveClass('active');
    expect(screen.getByText('SO-24018').closest('article')).toHaveClass('qr-order-card--list');
  });
});
