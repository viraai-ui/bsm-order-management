import { Link, useParams } from 'react-router-dom';
import { MachineStatusPanel } from '../components/MachineStatusPanel';
import { MediaUploadPanel } from '../components/MediaUploadPanel';
import { getMachineUnitById } from '../lib/apiClient';

export function MachineUnitPage() {
  const { id = '' } = useParams();
  const machine = getMachineUnitById(id);

  if (!machine) {
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
            <button className="ghost-button" type="button">Generate serial</button>
            <button className="ghost-button" type="button">Generate QR</button>
            <button className="primary-button" type="button">Mark ready for dispatch</button>
          </div>
          <p className="muted-copy">Ready for dispatch stays blocked until serial, QR, and required media all exist.</p>
        </section>
      </section>
    </main>
  );
}
