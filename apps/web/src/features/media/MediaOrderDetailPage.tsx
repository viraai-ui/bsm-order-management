import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MediaUploadPanel } from '../../components/MediaUploadPanel';
import { OperationsLayout } from '../../components/OperationsLayout';
import { deleteMedia, fetchOrderById, fetchMachineUnitById, uploadMediaToMachineUnit, type OrderDetail, type MachineUnitDetail } from '../../lib/apiClient';

export function MediaOrderDetailPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [machines, setMachines] = useState<Record<string, MachineUnitDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextOrder = await fetchOrderById(id);
      setOrder(nextOrder);

      const machineResults = await Promise.all(nextOrder.machineUnits.map(async (machine) => {
        try {
          return await fetchMachineUnitById(machine.id);
        } catch {
          return null;
        }
      }));

      setMachines(Object.fromEntries(machineResults.filter(Boolean).map((machine) => [machine!.id, machine!])));
    } catch (loadError) {
      setOrder(null);
      setMachines({});
      setError(loadError instanceof Error ? loadError.message : 'Failed to load media workflow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function refreshMachine(machineId: string) {
    try {
      const updatedMachine = await fetchMachineUnitById(machineId);
      setMachines((current) => ({ ...current, [machineId]: updatedMachine }));
      setOrder(await fetchOrderById(id));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh machine media');
    }
  }

  return (
    <OperationsLayout>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Media</p>
            <h2>{order?.salesOrderNumber ?? id}</h2>
            <p className="page-subtitle">Upload and manage machine proof inside the order workspace.</p>
          </div>
          <div className="topbar-actions">
            <Link className="ghost-button" to="/media">Back to media queue</Link>
            <button className="ghost-button" type="button" onClick={() => void loadOrder()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {loading ? <section className="detail-panel"><p className="muted-copy">Loading media workflow…</p></section> : null}
        {error ? <section className="detail-panel" role="alert"><p className="muted-copy">{error}</p></section> : null}

        {order ? (
          <section className="order-detail-stack">
            {order.machineUnits.map((machine) => {
              const machineDetail = machines[machine.id];
              return (
                <section className="detail-panel" key={machine.id}>
                  <div className="detail-panel-header">
                    <div>
                      <p className="eyebrow">{machine.id}</p>
                      <h3>{machine.productName}</h3>
                      <p className="muted-copy">{machine.workflowStage}</p>
                    </div>
                    <Link className="ghost-button" to={`/machine-units/${machine.id}`}>Machine detail</Link>
                  </div>
                  <MediaUploadPanel
                    photos={machineDetail?.photos ?? machine.imageCount}
                    videos={machineDetail?.videos ?? machine.videoCount}
                    requiredVideos={machineDetail?.requiredVideos ?? machine.requiredVideoCount}
                    mediaFiles={machineDetail?.mediaFiles ?? machine.mediaFiles}
                    onAddMedia={async (input) => {
                      await uploadMediaToMachineUnit(machine.id, input);
                      await refreshMachine(machine.id);
                    }}
                    onDeleteMedia={async (mediaId) => {
                      await deleteMedia(mediaId);
                      await refreshMachine(machine.id);
                    }}
                  />
                </section>
              );
            })}
          </section>
        ) : null}
      </main>
    </OperationsLayout>
  );
}
