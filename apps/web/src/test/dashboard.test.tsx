import { render, screen } from '@testing-library/react';
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

describe('dashboard detail flow', () => {
  it('renders all dispatch buckets on the dashboard', () => {
    renderWithRoutes(['/dashboard']);

    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  it('renders machine detail actions for a known unit route', () => {
    renderWithRoutes(['/machine-units/MU-24018-1']);

    expect(screen.getByText('Generate serial')).toBeInTheDocument();
    expect(screen.getByText('Generate QR')).toBeInTheDocument();
    expect(screen.getByText('Mark ready for dispatch')).toBeInTheDocument();
  });
});
