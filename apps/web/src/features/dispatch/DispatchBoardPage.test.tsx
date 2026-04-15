import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DispatchBoardPage } from './DispatchBoardPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DispatchBoardPage', () => {
  it('renders Team A and Team B split board cards', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          TEAM_A: [
            {
              id: 'BSM-24018',
              salesOrderNumber: 'BSM-24018',
              customerName: 'Anand Cooling Towers',
              destination: 'Delhi NCR',
              deliveryDate: '2026-04-13T08:30:00Z',
              status: 'Dispatch ready',
              teamAssignment: 'TEAM_A',
              machineUnitCount: 2,
              qrCodeCount: 2,
              videoCount: 3,
              requiredVideoCount: 3,
              machineUnits: [],
            },
          ],
          TEAM_B: [
            {
              id: 'BSM-24019',
              salesOrderNumber: 'BSM-24019',
              customerName: 'Northline Infra',
              destination: 'Lucknow',
              deliveryDate: '2026-04-14T08:30:00Z',
              status: 'Awaiting media',
              teamAssignment: 'TEAM_B',
              machineUnitCount: 1,
              qrCodeCount: 0,
              videoCount: 0,
              requiredVideoCount: 2,
              machineUnits: [],
            },
          ],
        },
      }),
    }));

    render(
      <MemoryRouter initialEntries={['/dispatch']}>
        <Routes>
          <Route path="/dispatch" element={<DispatchBoardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.getByText('Anand Cooling Towers')).toBeInTheDocument();
    expect(screen.getByText('Northline Infra')).toBeInTheDocument();
  });
});
