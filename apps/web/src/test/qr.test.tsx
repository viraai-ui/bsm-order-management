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
});
