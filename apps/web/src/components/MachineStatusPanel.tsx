type MachineStatusPanelProps = {
  workflowStage: string;
  serialNumber: string | null;
  qrReady: boolean;
  mediaComplete: boolean;
};

const checks = [
  { key: 'serial', label: 'Serial generated' },
  { key: 'qr', label: 'QR ready' },
  { key: 'media', label: 'Required media uploaded' },
] as const;

export function MachineStatusPanel({ workflowStage, serialNumber, qrReady, mediaComplete }: MachineStatusPanelProps) {
  const state = {
    serial: Boolean(serialNumber),
    qr: qrReady,
    media: mediaComplete,
  };

  const dispatchReady = state.serial && state.qr && state.media;

  return (
    <section className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">Workflow readiness</p>
          <h3>{workflowStage}</h3>
        </div>
        <span className={dispatchReady ? 'pill tone-live' : 'pill tone-urgent'}>
          {dispatchReady ? 'Dispatch ready' : 'Blocked'}
        </span>
      </div>

      <div className="check-list">
        {checks.map((check) => (
          <div className="check-row" key={check.key}>
            <span>{check.label}</span>
            <strong>{state[check.key] ? 'Done' : 'Missing'}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
