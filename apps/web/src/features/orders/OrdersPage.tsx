import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchOrders, type OrderSummary } from '../../lib/apiClient';
import { getOrderStageCode, getOrderStageLabel, getOrderStageSummary, getOrderStageTone } from './pipelineStage';

const pipelineStageOptions = [
  { value: 'ALL', label: 'All stages' },
  { value: 'QR_QUEUE', label: 'QR Queue' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

type PipelineStageFilter = typeof pipelineStageOptions[number]['value'];

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | 'TEAM_A' | 'TEAM_B'>('all');
  const [stageFilter, setStageFilter] = useState<PipelineStageFilter>('ALL');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrders(teamFilter === 'all' ? undefined : { teamAssignment: teamFilter });
      setOrders(data);
    } catch (loadError) {
      setOrders([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [teamFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery = !normalizedQuery || [
        order.salesOrderNumber,
        order.customerName,
        order.destination,
        order.status,
        getOrderStageLabel(order),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesStage = stageFilter === 'ALL' || getOrderStageCode(order) === stageFilter;
      return matchesQuery && matchesStage;
    });
  }, [orders, query, stageFilter]);

  return (
    <OperationsLayout
      rail={(
        <section className="rail-panel">
          <p className="eyebrow">Orders snapshot</p>
          <ul>
            <li>{orders.length} total sales orders in the current frontend view</li>
            <li>{orders.filter((order) => order.teamAssignment === 'TEAM_A').length} assigned to Team A</li>
            <li>{orders.filter((order) => order.teamAssignment === 'TEAM_B').length} assigned to Team B</li>
            <li>{orders.filter((order) => getOrderStageCode(order) === 'CLOSED').length} closed orders still visible in the ledger</li>
          </ul>
        </section>
      )}
    >
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Orders</p>
            <h2>Sales-order workspace</h2>
            <p className="page-subtitle">Search, route, and open every downstream workflow from the order instead of the machine unit.</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => void loadOrders()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh orders'}
            </button>
          </div>
        </header>

        <section className="detail-panel filter-panel">
          <div className="page-filters-grid pipeline-filters-grid">
            <label className="stacked-field">
              <span className="meta-label">Search orders</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number, customer, destination" />
            </label>
            <label className="stacked-field">
              <span className="meta-label">Team assignment</span>
              <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value as typeof teamFilter)}>
                <option value="all">All teams</option>
                <option value="TEAM_A">Team A</option>
                <option value="TEAM_B">Team B</option>
              </select>
            </label>
            <label className="stacked-field">
              <span className="meta-label">Pipeline stage</span>
              <select aria-label="Pipeline stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as PipelineStageFilter)}>
                {pipelineStageOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <section className="detail-panel" role="alert">
            <p className="eyebrow">Orders unavailable</p>
            <h3>We could not load the order list</h3>
            <p className="muted-copy">{error}</p>
          </section>
        ) : null}

        <section className="detail-panel">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Order ledger</p>
              <h3>{filteredOrders.length} result{filteredOrders.length === 1 ? '' : 's'}</h3>
            </div>
          </div>

          <div className="order-list">
            {loading ? <p className="muted-copy">Loading orders…</p> : null}

            {!loading && filteredOrders.length === 0 ? (
              <p className="muted-copy">No orders match the current search and team filters.</p>
            ) : null}

            {filteredOrders.map((order) => (
              <article className="order-list-card" key={order.id}>
                <div className="order-list-card-main">
                  <div>
                    <p className="eyebrow">{order.salesOrderNumber}</p>
                    <h3>{order.customerName}</h3>
                    <p className="muted-copy">{order.destination} • {order.deliveryLabel}</p>
                    <p className="muted-copy">{getOrderStageSummary(order)}</p>
                  </div>
                  <div className="order-badges">
                    <span className={`pill ${getOrderStageTone(order)}`}>
                      {getOrderStageLabel(order)}
                    </span>
                    <span className={`pill ${order.teamAssignment === 'TEAM_B' ? 'tone-urgent' : order.teamAssignment === 'TEAM_A' ? 'tone-live' : 'tone-neutral'}`}>
                      {order.teamAssignment === 'TEAM_B' ? 'Team B' : order.teamAssignment === 'TEAM_A' ? 'Team A' : 'Unassigned'}
                    </span>
                    <span className={`pill ${order.status === 'Dispatch ready' ? 'tone-live' : order.status === 'Dispatched' ? 'tone-muted' : 'tone-neutral'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="order-stats-grid">
                  <div><span className="meta-label">Machine units</span><strong>{order.machineUnitCount}</strong></div>
                  <div><span className="meta-label">QR ready</span><strong>{order.qrCodeCount}/{order.machineUnitCount}</strong></div>
                  <div><span className="meta-label">Media</span><strong>{order.videoCount}/{order.requiredVideoCount} videos</strong></div>
                </div>

                <div className="order-card-actions">
                  <Link className="ghost-button" to={`/orders/${order.id}`}>Open order</Link>
                  <Link className="ghost-button" to={`/qr/${order.id}`}>QR</Link>
                  <Link className="ghost-button" to={`/media/${order.id}`}>Media</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </OperationsLayout>
  );
}
