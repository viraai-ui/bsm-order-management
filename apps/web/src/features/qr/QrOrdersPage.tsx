import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchOrders, type OrderSummary } from '../../lib/apiClient';

export function QrOrdersPage() {
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
      setError(loadError instanceof Error ? loadError.message : 'Failed to load QR orders');
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
            <p className="eyebrow">QR code generator</p>
            <h2>Order-first QR queue</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => void loadOrders()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error ? <section className="detail-panel" role="alert"><p className="muted-copy">{error}</p></section> : null}

        <section className="detail-panel">
          <div className="order-list">
            {loading ? <p className="muted-copy">Loading QR queue…</p> : null}
            {orders.map((order) => (
              <article className="order-list-card" key={order.id}>
                <div className="order-list-card-main">
                  <div>
                    <p className="eyebrow">{order.salesOrderNumber}</p>
                    <h3>{order.customerName}</h3>
                    <p className="muted-copy">{order.qrCodeCount}/{order.machineUnitCount} machine units already have QR codes.</p>
                  </div>
                  <span className={`pill ${order.qrCodeCount === order.machineUnitCount ? 'tone-live' : 'tone-urgent'}`}>
                    {order.qrCodeCount === order.machineUnitCount ? 'Ready' : 'Action needed'}
                  </span>
                </div>
                <div className="order-card-actions">
                  <Link className="ghost-button" to={`/qr/${order.id}`}>Open QR workflow</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </OperationsLayout>
  );
}
