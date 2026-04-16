import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import {
  fetchOrderById,
  generateQrsForOrder,
  generateQrForMachineUnit,
  generateSerialForMachineUnit,
  type OrderDetail,
} from '../../lib/apiClient';
import { getOrderStageLabel, getOrderStageSummary, getOrderStageTone, isQrComplete } from '../orders/pipelineStage';

export function QrOrderDetailPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMachineId, setBusyMachineId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setOrder(await fetchOrderById(id));
    } catch (loadError) {
      setOrder(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load QR order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function refreshAfterMachineAction(machineId: string, run: () => Promise<unknown>) {
    setBusyMachineId(machineId);
    setError(null);

    try {
      await run();
      setOrder(await fetchOrderById(id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update QR workflow');
    } finally {
      setBusyMachineId(null);
    }
  }

  async function handleGenerateAll() {
    setBulkBusy(true);
    setError(null);

    try {
      setOrder(await generateQrsForOrder(id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to generate all QR codes');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <OperationsLayout>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">QR code generator</p>
            <h2>{order?.salesOrderNumber ?? id}</h2>
            <p className="page-subtitle">Generate QR assets from the order and drill into individual machine units only when needed.</p>
            {order ? <p className="muted-copy">{getOrderStageSummary(order)}</p> : null}
          </div>
          <div className="topbar-actions">
            <button className="primary-button" type="button" onClick={() => void handleGenerateAll()} disabled={bulkBusy || loading}>
              {bulkBusy ? 'Generating all…' : 'Generate all QRs'}
            </button>
            <Link className="ghost-button" to="/qr">Back to QR queue</Link>
          </div>
        </header>

        {loading ? <section className="detail-panel"><p className="muted-copy">Loading QR workflow…</p></section> : null}
        {error ? <section className="detail-panel" role="alert"><p className="muted-copy">{error}</p></section> : null}

        {order ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <div>
                <p className="eyebrow">Machine units</p>
                <h3>{order.qrCodeCount}/{order.machineUnitCount} QR ready</h3>
              </div>
              <div className="order-badges">
                <span className={`pill ${isQrComplete(order) ? 'tone-live' : 'tone-urgent'}`}>
                  {isQrComplete(order) ? 'QR complete' : 'QR in progress'}
                </span>
                <span className={`pill ${getOrderStageTone(order)}`}>{getOrderStageLabel(order)}</span>
              </div>
            </div>
            <div className="order-list compact">
              {order.machineUnits.map((machine) => (
                <article className="order-list-card compact" key={machine.id}>
                  <div className="order-list-card-main">
                    <div>
                      <p className="eyebrow">{machine.id}</p>
                      <h3>{machine.productName}</h3>
                      <p className="muted-copy">{machine.serialNumber ? `Serial ${machine.serialNumber}` : 'Serial pending'}</p>
                    </div>
                    <span className={`pill ${machine.qrReady ? 'tone-live' : 'tone-urgent'}`}>
                      {machine.qrReady ? 'QR ready' : 'QR pending'}
                    </span>
                  </div>
                  <div className="order-card-actions">
                    <button className="ghost-button" type="button" onClick={() => void refreshAfterMachineAction(machine.id, () => generateSerialForMachineUnit(machine.id))} disabled={busyMachineId === machine.id || bulkBusy}>
                      {busyMachineId === machine.id ? 'Working…' : 'Generate serial'}
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void refreshAfterMachineAction(machine.id, () => generateQrForMachineUnit(machine.id))} disabled={busyMachineId === machine.id || bulkBusy}>
                      {busyMachineId === machine.id ? 'Working…' : 'Generate QR'}
                    </button>
                    <Link className="ghost-button" to={`/machine-units/${machine.id}`}>Machine detail</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </OperationsLayout>
  );
}
