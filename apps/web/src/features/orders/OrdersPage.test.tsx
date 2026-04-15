import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrdersPage } from './OrdersPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OrdersPage', () => {
  it('renders order-first list items and module links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'BSM-24018',
            salesOrderNumber: 'BSM-24018',
            customerName: 'Anand Cooling Towers',
            destination: 'Delhi NCR',
            deliveryDate: '2026-04-13T08:30:00Z',
            status: 'Dispatch ready',
            teamAssignment: 'TEAM_A',
            machineUnitCount: 2,
            qrCodeCount: 1,
            videoCount: 2,
            requiredVideoCount: 3,
            machineUnits: [
              { id: 'MU-24018-1', zohoLineItemId: 'line-1', productName: 'Axial Fan Unit', quantity: 1 },
            ],
          },
        ],
      }),
    }));

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Sales-order workspace')).toBeInTheDocument();
    expect(screen.getByText('Anand Cooling Towers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open order' })).toHaveAttribute('href', '/orders/BSM-24018');
    expect(screen.getByRole('link', { name: 'QR' })).toHaveAttribute('href', '/qr/BSM-24018');
    expect(screen.getAllByRole('link', { name: 'Media' }).find((node) => node.getAttribute('href') === '/media/BSM-24018')).toBeTruthy();
  });
});
