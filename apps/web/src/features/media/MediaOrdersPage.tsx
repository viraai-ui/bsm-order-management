import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchOrders, type OrderSummary } from '../../lib/apiClient';

export function MediaOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setOrders(await fetchOrders());
    } catch (loadError) {
      setOrders([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load media orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <OperationsLayout>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Media</p>
            <h2>Order-first media queue</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => void loadOrders()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error ? <section className="detail-panel" role="alert"><p className="muted-copy">{error}</p></section> : null}

        <section className="detail-panel">
          <div className="order-list">
            {loading ? <p className="muted-copy">Loading media queue…</p> : null}
            {orders.map((order) => (
              <article className="order-list-card" key={order.id}>
                <div className="order-list-card-main">
                  <div>
                    <p className="eyebrow">{order.salesOrderNumber}</p>
                    <h3>{order.customerName}</h3>
                    <p className="muted-copy">{order.imageCount} photos, {order.videoCount}/{order.requiredVideoCount} videos uploaded</p>
                  </div>
                  <span className={`pill ${order.videoCount >= order.requiredVideoCount && order.imageCount >= order.machineUnitCount ? 'tone-live' : 'tone-neutral'}`}>
                    {order.videoCount >= order.requiredVideoCount ? 'Near complete' : 'Collect media'}
                  </span>
                </div>
                <div className="order-card-actions">
                  <Link className="ghost-button" to={`/media/${order.id}`}>Open media workflow</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </OperationsLayout>
  );
}
