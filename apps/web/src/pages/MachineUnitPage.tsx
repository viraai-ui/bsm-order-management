import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MachineStatusPanel } from '../components/MachineStatusPanel';
import { MediaUploadPanel } from '../components/MediaUploadPanel';
import {
  deleteMedia,
  fetchMachineUnitById,
  generateQrForMachineUnit,
  generateSerialForMachineUnit,
  markMachineUnitDispatched,
  updateMachineWorkflowStage,
  uploadMediaToMachineUnit,
  type MachineUnitDetail,
} from '../lib/apiClient';

export function MachineUnitPage() {
  const { id = '' } = useParams();
  const [machine, setMachine] = useState<MachineUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [activeAction, setActiveAction] = useState<'serial' | 'qr' | 'dispatch' | 'media' | 'stage' | null>(null);

  const loadMachine = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextMachine = await fetchMachineUnitById(id);
      setMachine(nextMachine);
      setDispatchNotes(nextMachine.dispatchNotes ?? '');
    } catch (loadError) {
      setMachine(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load machine unit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMachine();
  }, [loadMachine]);

  async function runAction(action: 'serial' | 'qr' | 'dispatch' | 'media' | 'stage', request: () => Promise<MachineUnitDetail>) {
    setActionError(null);
    setActiveAction(action);

    try {
      const updated = await request();
      setMachine(updated);
      if (updated.dispatchNotes != null) {
        setDispatchNotes(updated.dispatchNotes);
      }
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Unable to update machine unit');
    } finally {
      setActiveAction(null);
    }
  }

  function handleGenerateSerial() {
    void runAction('serial', () => generateSerialForMachineUnit(id));
  }

  function handleGenerateQr() {
    void runAction('qr', () => generateQrForMachineUnit(id));
  }

  function handleMarkDispatched() {
    void runAction('dispatch', () => markMachineUnitDispatched(id, dispatchNotes.trim() || undefined));
  }

  function handleMarkMediaUploaded() {
    void runAction('stage', () => updateMachineWorkflowStage(id, 'MEDIA_UPLOADED'));
  }

  async function handleAddMedia(input: { kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; file: File }) {
    await runAction('media', () => uploadMediaToMachineUnit(id, input));
  }

  async function handleDeleteMedia(mediaId: string) {
    await runAction('media', () => deleteMedia(mediaId));
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="detail-panel"><p>Loading machine unit...</p></div>
      </main>
    );
  }

  if (!machine) {
    const title = error === 'Machine unit not found' ? 'Machine not found' : 'Machine unavailable';

    return (
      <main className="page-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Machine unit</p>
            <h1>{title}</h1>
            {error ? <p className="page-subtitle">{error}</p> : null}
          </div>
          <div className="action-grid">
            <button className="ghost-button" type="button" onClick={() => void loadMachine()}>Retry</button>
            <Link className="ghost-button" to="/dashboard">Back to dashboard</Link>
          </div>
        </div>
      </main>
    );
  }

  const dispatched = machine.workflowStage === 'Dispatched';

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Machine unit detail</p>
          <h1>{machine.unitCode}</h1>
          <p className="page-subtitle">{machine.productName} for {machine.customer}</p>
        </div>
        <Link className="ghost-button" to="/dashboard">Back to dashboard</Link>
      </div>

      <section className="machine-hero-grid">
        <div className="detail-panel">
          <p className="eyebrow">Dispatch context</p>
          <div className="machine-summary-grid">
            <div><span className="meta-label">Sales order</span><strong>{machine.orderId}</strong></div>
            <div><span className="meta-label">Destination</span><strong>{machine.destination}</strong></div>
            <div><span className="meta-label">Schedule</span><strong>{machine.scheduledFor}</strong></div>
            <div><span className="meta-label">Serial number</span><strong>{machine.serialNumber ?? 'Pending'}</strong></div>
            <div><span className="meta-label">Dispatch status</span><strong>{machine.workflowStage}</strong></div>
            <div><span className="meta-label">Dispatched at</span><strong>{machine.dispatchedAt ? new Date(machine.dispatchedAt).toLocaleString('en-IN', { timeZone: 'UTC' }) : 'Pending'}</strong></div>
          </div>
        </div>

        <MachineStatusPanel
          workflowStage={machine.workflowStage}
          serialNumber={machine.serialNumber}
          qrReady={machine.qrReady}
          mediaComplete={machine.mediaComplete}
        />
      </section>

      <section className="machine-body-grid">
        <MediaUploadPanel
          photos={machine.photos}
          videos={machine.videos}
          requiredVideos={machine.requiredVideos}
          mediaFiles={machine.mediaFiles}
          disabled={activeAction !== null || dispatched}
          onAddMedia={handleAddMedia}
          onDeleteMedia={handleDeleteMedia}
        />

        <section className="detail-panel">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Actions</p>
              <h3>Dispatch workflow</h3>
            </div>
          </div>
          <div className="action-grid action-grid-wide">
            <button className="ghost-button" type="button" onClick={handleGenerateSerial} disabled={activeAction !== null || dispatched}>
              {activeAction === 'serial' ? 'Generating serial…' : 'Generate serial'}
            </button>
            <button className="ghost-button" type="button" onClick={handleGenerateQr} disabled={activeAction !== null || dispatched}>
              {activeAction === 'qr' ? 'Generating QR…' : 'Generate QR'}
            </button>
            <button className="ghost-button" type="button" onClick={handleMarkMediaUploaded} disabled={activeAction !== null || dispatched}>
              {activeAction === 'stage' ? 'Updating stage…' : 'Refresh stage from media'}
            </button>
          </div>

          <label className="stacked-field">
            <span className="meta-label">Dispatch notes</span>
            <textarea
              aria-label="Dispatch notes"
              value={dispatchNotes}
              onChange={(event) => setDispatchNotes(event.target.value)}
              placeholder="Carrier, dock, or handover notes"
              disabled={activeAction !== null || dispatched}
              rows={4}
            />
          </label>

          <button className="primary-button" type="button" onClick={handleMarkDispatched} disabled={activeAction !== null || dispatched}>
            {dispatched ? 'Dispatch completed' : activeAction === 'dispatch' ? 'Marking dispatched…' : 'Mark dispatched'}
          </button>

          {actionError ? <p className="muted-copy" role="alert">{actionError}</p> : null}
          <p className="muted-copy">
            Dispatch completion stays blocked until serial, QR, and required media all exist.
          </p>
        </section>
      </section>
    </main>
  );
}
