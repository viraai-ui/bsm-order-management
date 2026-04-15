import { useCallback, useEffect, useMemo, useState } from 'react';
import { OrderBucket } from '../../components/OrderBucket';
import { SyncButton } from '../../components/SyncButton';
import { fetchDashboardOrders, groupOrdersByBucket, type DispatchOrder } from '../../lib/apiClient';
import { signOutDemoUser } from '../auth/auth';

type StageFilter = 'all' | 'blocked' | 'ready' | 'dispatched';

function isBlocked(order: DispatchOrder) {
  return order.status !== 'Dispatch ready' && order.status !== 'Dispatched';
}

export function DashboardPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [activeOnly, setActiveOnly] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextOrders = await fetchDashboardOrders();
      setOrders(nextOrders);
    } catch (loadError) {
      setOrders([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dispatch dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeOnly && order.status === 'Dispatched') {
        return false;
      }

      if (stageFilter === 'blocked') {
        return isBlocked(order);
      }

      if (stageFilter === 'ready') {
        return order.status === 'Dispatch ready';
      }

      if (stageFilter === 'dispatched') {
        return order.status === 'Dispatched';
      }

      return true;
    });
  }, [activeOnly, orders, stageFilter]);

  const grouped = groupOrdersByBucket(filteredOrders);
  const activeOrders = orders.filter((order) => order.status !== 'Dispatched');
  const readyOrders = activeOrders.filter((order) => order.status === 'Dispatch ready');
  const blockedOrders = activeOrders.filter((order) => isBlocked(order));

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">BSM Ops</p>
          <h1>Dispatch OS</h1>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {['Dashboard', 'Orders', 'Machine Units', 'Dispatch', 'Media', 'Users', 'Sync Logs'].map((item) => (
            <button key={item} className={item === 'Dashboard' ? 'nav-item active' : 'nav-item'} type="button">
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations board</p>
            <h2>Dispatch dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => void loadOrders()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Manual refresh'}
            </button>
            <SyncButton lastSyncedAt="08:10 UTC" pendingJobs={4} />
            <button className="user-chip" type="button" onClick={signOutDemoUser}>TT</button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="metric-card live-panel">
            <span className="meta-label">Active machine units</span>
            <strong>{activeOrders.length.toString().padStart(2, '0')}</strong>
            <p>Dispatched units stay hidden by default so operators can work the live queue.</p>
          </div>
          <div className="metric-card">
            <span className="meta-label">Dispatch ready</span>
            <strong>{readyOrders.length.toString().padStart(2, '0')}</strong>
            <p>Units ready to hand over right now.</p>
          </div>
          <div className="metric-card warning-panel">
            <span className="meta-label">Blocked units</span>
            <strong>{blockedOrders.length.toString().padStart(2, '0')}</strong>
            <p>
              {loading
                ? 'Loading dispatch blockers...'
                : error
                  ? 'Dispatch data unavailable. Check the API connection and retry.'
                  : 'Media, serial, or QR gaps still need operator attention.'}
            </p>
          </div>
        </section>

        <section className="detail-panel filter-panel">
          <div className="detail-panel-header">
            <div>
              <p className="eyebrow">Queue filters</p>
              <h3>Work the active dispatch lane</h3>
            </div>
            <button
              className={activeOnly ? 'pill tone-live filter-toggle active' : 'pill tone-muted filter-toggle'}
              type="button"
              onClick={() => setActiveOnly((current) => !current)}
            >
              {activeOnly ? 'Active only' : 'Show dispatched too'}
            </button>
          </div>

          <div className="filter-row" role="group" aria-label="Stage filters">
            {[
              ['all', 'All'],
              ['blocked', 'Blocked'],
              ['ready', 'Ready'],
              ['dispatched', 'Dispatched'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={stageFilter === value ? 'filter-chip active' : 'filter-chip'}
                onClick={() => setStageFilter(value as StageFilter)}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="muted-copy">
            Showing {filteredOrders.length} machine unit{filteredOrders.length === 1 ? '' : 's'} across all dispatch buckets.
          </p>
        </section>

        {error ? (
          <section className="detail-panel" role="alert">
            <p className="eyebrow">Dashboard unavailable</p>
            <h3>We could not load dispatch orders</h3>
            <p className="muted-copy">{error}</p>
            <button className="ghost-button" type="button" onClick={() => void loadOrders()}>
              Retry
            </button>
          </section>
        ) : null}

        <section className="buckets-grid">
          <OrderBucket bucket="Urgent" orders={grouped.Urgent} />
          <OrderBucket bucket="Today" orders={grouped.Today} />
          <OrderBucket bucket="Tomorrow" orders={grouped.Tomorrow} />
          <OrderBucket bucket="Later" orders={grouped.Later} />
        </section>

        {!loading && !error && filteredOrders.length === 0 ? (
          <section className="detail-panel">
            <p className="eyebrow">No dispatch work</p>
            <h3>No machine units match the current filters</h3>
            <p className="muted-copy">Try a different stage filter or include dispatched units again.</p>
          </section>
        ) : null}
      </main>

      <aside className="rail">
        <section className="rail-panel">
          <p className="eyebrow">Alerts</p>
          <ul>
            <li>{blockedOrders.length} active units still blocked before dispatch</li>
            <li>{readyOrders.length} units are ready for handover</li>
            <li>{activeOnly ? 'Dispatched units are hidden from the main queue' : 'Historical dispatched units are visible right now'}</li>
          </ul>
        </section>
        <section className="rail-panel">
          <p className="eyebrow">Recent sync activity</p>
          <ul>
            <li>08:10, Inventory sync complete</li>
            <li>08:07, 14 machine units updated</li>
            <li>07:58, 3 dispatch photos uploaded</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
