import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchOrders, type OrderSummary } from '../../lib/apiClient';
import { getOrderStageCode, getOrderStageLabel, getOrderStageSummary, getOrderStageTone, isQrComplete } from '../orders/pipelineStage';

const filterOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'QR_GENERATED', label: 'QR Generated' },
  { value: 'ALL', label: 'All' },
] as const;

type QrFilter = typeof filterOptions[number]['value'];

export function QrOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<QrFilter>('ACTIVE');

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

  const visibleOrders = useMemo(() => {
    if (stageFilter === 'QR_GENERATED') {
      return orders.filter((order) => isQrComplete(order));
    }

    if (stageFilter === 'ACTIVE') {
      return orders.filter((order) => !isQrComplete(order));
    }

    return orders;
  }, [orders, stageFilter]);

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

        <section className="detail-panel filter-panel">
          <div className="filter-row" aria-label="QR stage filters">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`filter-chip ${stageFilter === option.value ? 'active' : ''}`}
                type="button"
                onClick={() => setStageFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="muted-copy">
            {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'} in the {stageFilter === 'ACTIVE' ? 'active QR queue' : stageFilter === 'QR_GENERATED' ? 'QR-generated queue' : 'full QR ledger'}.
          </p>
        </section>

        <section className="detail-panel">
          <div className="order-list">
            {loading ? <p className="muted-copy">Loading QR queue…</p> : null}
            {!loading && visibleOrders.length === 0 ? <p className="muted-copy">No orders match this QR stage filter.</p> : null}
            {visibleOrders.map((order) => (
              <article className="order-list-card" key={order.id}>
                <div className="order-list-card-main">
                  <div>
                    <p className="eyebrow">{order.salesOrderNumber}</p>
                    <h3>{order.customerName}</h3>
                    <p className="muted-copy">{order.qrCodeCount}/{order.machineUnitCount} machine units already have QR codes.</p>
                    <p className="muted-copy">{getOrderStageSummary(order)}</p>
                  </div>
                  <div className="order-badges">
                    <span className={`pill ${isQrComplete(order) ? 'tone-live' : 'tone-urgent'}`}>
                      {isQrComplete(order) ? 'QR ready' : 'Action needed'}
                    </span>
                    <span className={`pill ${getOrderStageTone(order)}`}>
                      {getOrderStageLabel(order)}
                    </span>
                  </div>
                </div>
                <div className="order-card-actions">
                  <Link className="ghost-button" to={`/qr/${order.id}`}>Open QR workflow</Link>
                  {getOrderStageCode(order) !== 'QR_QUEUE' ? <Link className="ghost-button" to={`/orders/${order.id}`}>Open order</Link> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </OperationsLayout>
  );
}
