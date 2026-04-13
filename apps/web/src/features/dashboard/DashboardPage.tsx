import { useCallback, useEffect, useState } from 'react';
import { OrderBucket } from '../../components/OrderBucket';
import { SyncButton } from '../../components/SyncButton';
import { fetchDashboardOrders, groupOrdersByBucket, type DispatchOrder } from '../../lib/apiClient';
import { signOutDemoUser } from '../auth/auth';

export function DashboardPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const grouped = groupOrdersByBucket(orders);

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
            <span className="meta-label">Dispatch efficiency</span>
            <strong>98.4%</strong>
            <p>Three units blocked by missing media proof.</p>
          </div>
          <div className="metric-card">
            <span className="meta-label">Pending sync jobs</span>
            <strong>04</strong>
            <p>Last successful pull at 08:10 UTC.</p>
          </div>
          <div className="metric-card warning-panel">
            <span className="meta-label">Urgent queue</span>
            <strong>{grouped.Urgent.length.toString().padStart(2, '0')}</strong>
            <p>
              {loading
                ? 'Loading dispatch buckets...'
                : error
                  ? 'Dispatch data unavailable. Check the API connection and retry.'
                  : 'Live bucket counts from the real API.'}
            </p>
          </div>
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

        {!loading && !error && orders.length === 0 ? (
          <section className="detail-panel">
            <p className="eyebrow">No dispatch work</p>
            <h3>No machine units are queued right now</h3>
            <p className="muted-copy">Once orders land in the API, they will appear in the dispatch buckets above.</p>
          </section>
        ) : null}
      </main>

      <aside className="rail">
        <section className="rail-panel">
          <p className="eyebrow">Alerts</p>
          <ul>
            <li>2 orders missing mandatory dispatch video</li>
            <li>1 QR serial batch awaiting approval</li>
            <li>Zoho token scope upgrade still pending</li>
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
