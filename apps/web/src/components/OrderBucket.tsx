import { Link } from 'react-router-dom';
import type { DispatchBucket, DispatchOrder } from '../lib/apiClient';

const toneClassByBucket: Record<DispatchBucket, string> = {
  Urgent: 'tone-urgent',
  Today: 'tone-live',
  Tomorrow: 'tone-neutral',
  Later: 'tone-muted',
};

function stageTone(status: DispatchOrder['status']) {
  if (status === 'Dispatch ready') return 'tone-live';
  if (status === 'Dispatched') return 'tone-muted';
  if (status === 'Testing complete') return 'tone-neutral';
  return 'tone-urgent';
}

export function OrderBucket({ bucket, orders }: { bucket: DispatchBucket; orders: DispatchOrder[] }) {
  return (
    <section className="bucket">
      <div className="bucket-header">
        <div>
          <p className="bucket-kicker">Dispatch bucket</p>
          <h3>{bucket}</h3>
        </div>
        <span className={`bucket-count ${toneClassByBucket[bucket]}`}>{orders.length}</span>
      </div>

      <div className="bucket-list">
        {orders.length === 0 ? (
          <p className="muted-copy bucket-empty">No matching machine units.</p>
        ) : (
          orders.map((order) => (
            <Link className="dispatch-card card-link" key={order.id} to={`/machine-units/${order.machineUnitId}`}>
              <span className={`status-ribbon ${toneClassByBucket[bucket]}`} />
              <div className="card-row">
                <strong>{order.id}</strong>
                <span className={`pill ${toneClassByBucket[bucket]}`}>{order.priority}</span>
              </div>
              <h4>{order.customer}</h4>
              <p>{order.destination}</p>
              <div className="meta-grid">
                <div>
                  <span className="meta-label">Schedule</span>
                  <span>{order.scheduledFor}</span>
                </div>
                <div>
                  <span className="meta-label">Stage</span>
                  <span className={`pill ${stageTone(order.status)}`}>{order.status}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
