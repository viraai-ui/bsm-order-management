import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MachineStatusPanel } from '../components/MachineStatusPanel';
import { MediaUploadPanel } from '../components/MediaUploadPanel';
import {
  fetchMachineUnitById,
  generateQrForMachineUnit,
  generateSerialForMachineUnit,
  getMachineUnitById,
  markMachineUnitReadyForDispatch,
  type MachineUnitDetail,
} from '../lib/apiClient';

export function MachineUnitPage() {
  const { id = '' } = useParams();
  const [machine, setMachine] = useState<MachineUnitDetail | null>(() => getMachineUnitById(id));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachineUnitById(id)
      .then(setMachine)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleGenerateSerial() {
    const updated = await generateSerialForMachineUnit(id);
    if (updated) setMachine(updated);
  }

  async function handleGenerateQr() {
    const updated = await generateQrForMachineUnit(id);
    if (updated) setMachine(updated);
  }

  async function handleMarkReady() {
    const updated = await markMachineUnitReadyForDispatch(id);
    if (updated) setMachine(updated);
  }

  if (!machine && !loading) {
    return (
      <main className="page-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Machine unit</p>
            <h1>Machine not found</h1>
          </div>
          <Link className="ghost-button" to="/dashboard">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  if (!machine) {
    return (
      <main className="page-shell">
        <div className="detail-panel"><p>Loading machine unit...</p></div>
      </main>
    );
  }

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
        <MediaUploadPanel photos={machine.photos} videos={machine.videos} requiredVideos={machine.requiredVideos} />

        <section className="detail-panel">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Actions</p>
              <h3>Dispatch workflow</h3>
            </div>
          </div>
          <div className="action-grid">
            <button className="ghost-button" type="button" onClick={handleGenerateSerial}>Generate serial</button>
            <button className="ghost-button" type="button" onClick={handleGenerateQr}>Generate QR</button>
            <button className="primary-button" type="button" onClick={handleMarkReady}>Mark ready for dispatch</button>
          </div>
          <p className="muted-copy">
            {loading ? 'Refreshing machine state from API...' : 'Ready for dispatch stays blocked until serial, QR, and required media all exist.'}
          </p>
        </section>
      </section>
    </main>
  );
}
