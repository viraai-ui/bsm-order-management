import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import {
  fetchOrderById,
  generateQrsForOrder,
  generateQrForMachineUnit,
  generateSerialForMachineUnit,
  type OrderDetail,
} from '../../lib/apiClient';
import {
  buildGeneratedQrAssets,
  buildQrPreviewUrl,
  downloadGeneratedQrAsset,
  runGenerateQrWorkflow,
} from './qrWorkflow';

type QrDetailViewMode = 'card' | 'list';
type OrderMachineUnit = OrderDetail['machineUnits'][number];

export function QrOrderDetailPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMachineId, setBusyMachineId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [viewMode, setViewMode] = useState<QrDetailViewMode>('card');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

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

  const generatedAssets = useMemo(() => {
    if (!order) return [];
    return buildGeneratedQrAssets(order.machineUnits, order.salesOrderNumber);
  }, [order]);

  useEffect(() => {
    let active = true;

    if (generatedAssets.length === 0) {
      setPreviewUrls({});
      return () => {
        active = false;
      };
    }

    void Promise.all(generatedAssets.map(async (asset) => [asset.value, await buildQrPreviewUrl(asset)] as const)).then((entries) => {
      if (!active) return;
      setPreviewUrls(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [generatedAssets]);

  const refreshOrder = useCallback(async () => {
    setOrder(await fetchOrderById(id));
  }, [id]);

  const handleGenerateForMachine = useCallback(async (machine: OrderMachineUnit) => {
    setBusyMachineId(machine.id);
    setError(null);

    try {
      await runGenerateQrWorkflow(machine, {
        generateSerial: generateSerialForMachineUnit,
        generateQr: generateQrForMachineUnit,
      });
      await refreshOrder();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update QR workflow');
    } finally {
      setBusyMachineId(null);
    }
  }, [refreshOrder]);

  const handleDownloadQr = useCallback(async (machine: OrderMachineUnit) => {
    if (!order) return;

    const asset = buildGeneratedQrAssets([machine], order.salesOrderNumber)[0];
    if (!asset) return;

    try {
      await downloadGeneratedQrAsset(asset);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download QR');
    }
  }, [order]);

  const handleDownloadAll = useCallback(async () => {
    if (generatedAssets.length === 0) return;

    try {
      for (const asset of generatedAssets) {
        await downloadGeneratedQrAsset(asset);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download all QR assets');
    }
  }, [generatedAssets]);

  const handleGenerateAll = useCallback(async () => {
    setBulkBusy(true);
    setError(null);

    try {
      setOrder(await generateQrsForOrder(id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to generate all QR codes');
    } finally {
      setBulkBusy(false);
    }
  }, [id]);

  function renderPreview(machine: OrderMachineUnit) {
    if (!machine.qrCodeValue) {
      return (
        <div className="qr-preview-placeholder">
          <span className="qr-preview-placeholder__label">QR preview pending</span>
        </div>
      );
    }

    const previewUrl = previewUrls[machine.qrCodeValue];
    if (!previewUrl) {
      return <p className="muted-copy">Loading QR preview…</p>;
    }

    return <img className="qr-preview-image" src={previewUrl} alt={`QR preview for ${machine.productName}`} />;
  }

  function renderMachine(machine: OrderMachineUnit) {
    const hasGeneratedQr = Boolean(machine.serialNumber && machine.qrCodeValue);
    const machineStatusLabel = hasGeneratedQr ? 'QR Generated' : 'QR Pending';
    const serialCopy = machine.serialNumber ? `Serial ${machine.serialNumber}` : 'Serial pending';
    const isBusy = busyMachineId === machine.id;

    return (
      <article className={viewMode === 'card' ? 'qr-machine-card qr-machine-card--card' : 'qr-machine-card qr-machine-card--list'} key={machine.id}>
        <div className="qr-machine-card__body">
          <div className="qr-machine-card__info">
            <div className="qr-machine-card__summary">
              <div>
                <h3>{machine.productName}</h3>
                <p className="muted-copy">{serialCopy}</p>
              </div>
              <span className={`pill ${hasGeneratedQr ? 'tone-live' : 'tone-urgent'}`}>{machineStatusLabel}</span>
            </div>

            <div className="qr-machine-card__actions">
              <button
                className="premium-action-button"
                type="button"
                onClick={() => void handleGenerateForMachine(machine)}
                disabled={isBusy || bulkBusy}
              >
                {isBusy ? 'Generating…' : 'Generate QR'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void handleDownloadQr(machine)}
                disabled={!hasGeneratedQr || isBusy || bulkBusy}
              >
                Download QR
              </button>
            </div>
          </div>

          <div className="qr-machine-card__preview">
            <p className="eyebrow">QR Preview</p>
            {renderPreview(machine)}
          </div>
        </div>
      </article>
    );
  }

  return (
    <OperationsLayout hideRail>
      <main className="main-panel qr-order-detail-page">
        <header className="topbar qr-page-header">
          <div>
            <h2>{order?.salesOrderNumber ?? id}</h2>
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
          <>
            <section className="detail-panel qr-detail-toolbar">
              <div className="filter-row" role="group" aria-label="QR detail view toggle">
                <button
                  className={viewMode === 'card' ? 'filter-chip active' : 'filter-chip'}
                  type="button"
                  aria-pressed={viewMode === 'card'}
                  onClick={() => setViewMode('card')}
                >
                  Card View
                </button>
                <button
                  className={viewMode === 'list' ? 'filter-chip active' : 'filter-chip'}
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
              </div>
            </section>

            <section className="detail-panel">
              <div className={viewMode === 'card' ? 'qr-machine-grid qr-machine-grid--card' : 'qr-machine-grid qr-machine-grid--list'}>
                {order.machineUnits.map((machine) => renderMachine(machine))}
              </div>

              <div className="order-card-actions qr-detail-footer-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  disabled={generatedAssets.length === 0 || bulkBusy}
                >
                  Download All
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </OperationsLayout>
  );
}
