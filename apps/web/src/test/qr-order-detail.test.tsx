import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QrOrderDetailPage } from '../features/qr/QrOrderDetailPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QrOrderDetailPage', () => {
  it('renders the cleaned detail layout with previews and download actions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'SO-24018',
          salesOrderNumber: 'SO-24018',
          customerName: 'Anand Cooling Towers',
          destination: 'Delhi NCR',
          deliveryDate: '2026-04-13T08:30:00Z',
          status: 'Awaiting media',
          machineUnitCount: 2,
          qrCodeCount: 1,
          serialNumberCount: 1,
          imageCount: 0,
          videoCount: 0,
          requiredVideoCount: 2,
          workflowSummary: {
            awaitingMediaCount: 2,
            mediaUploadedCount: 0,
            readyForDispatchCount: 0,
            dispatchedCount: 0,
          },
          machineUnits: [
            {
              id: 'MU-001',
              productName: 'Freezer Unit 1',
              serialNumber: null,
              qrCodeValue: null,
              workflowStage: 'PACKING_TESTING',
            },
            {
              id: 'MU-002',
              productName: 'Freezer Unit 2',
              serialNumber: '262700014',
              qrCodeValue: 'qr://262700014',
              workflowStage: 'PACKING_TESTING',
            },
          ],
        },
      }),
    }));

    render(
      <MemoryRouter initialEntries={['/qr/SO-24018']}>
        <Routes>
          <Route path="/qr/:id" element={<QrOrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'SO-24018' })).toBeInTheDocument();
    expect(screen.queryByText('Generate QR assets from the order and drill into individual machine units only when needed.')).not.toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Card View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download All' })).toBeInTheDocument();
    expect(screen.queryByText('MU-001')).not.toBeInTheDocument();
    expect(screen.queryByText('Machine detail')).not.toBeInTheDocument();
    expect(screen.getByText('QR preview pending')).toBeInTheDocument();
    expect(screen.getByText('QR Generated')).toBeInTheDocument();
    expect(await screen.findByAltText('QR preview for Freezer Unit 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Download QR' })).toHaveLength(2);
  });
});
