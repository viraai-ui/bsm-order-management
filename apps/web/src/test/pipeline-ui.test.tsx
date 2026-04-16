import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrdersPage } from '../features/orders/OrdersPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pipeline ui', () => {
  it('shows closed orders in the Orders master list and filters by stage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'order-open',
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
            id: 'order-closed',
            salesOrderNumber: 'SO-24077',
            customerName: 'Closed Customer',
            destination: 'Jaipur',
            deliveryDate: '2026-04-15T08:30:00Z',
            status: 'Dispatched',
            teamAssignment: 'TEAM_B',
            machineUnitCount: 1,
            qrCodeCount: 1,
            imageCount: 1,
            videoCount: 1,
            requiredVideoCount: 1,
            machineUnits: [],
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

    expect(await screen.findByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Closed Customer')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Pipeline stage'), 'CLOSED');

    expect(await screen.findByText('Closed Customer')).toBeInTheDocument();
    expect(screen.queryByText('Anand Cooling Towers')).not.toBeInTheDocument();
  });
});
