import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchOrderById, updateOrderTeamAssignment, type OrderDetail, type TeamAssignment } from '../../lib/apiClient';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setOrder(await fetchOrderById(id));
    } catch (loadError) {
      setOrder(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function handleTeamChange(teamAssignment: TeamAssignment) {
    setSavingTeam(true);
    setError(null);

    try {
      setOrder(await updateOrderTeamAssignment(id, teamAssignment));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update team assignment');
    } finally {
      setSavingTeam(false);
    }
  }

  return (
    <OperationsLayout
      rail={(
        <>
          <section className="rail-panel">
            <p className="eyebrow">Workflow summary</p>
            {order ? (
              <ul>
                <li>{order.workflowSummary.awaitingMediaCount} waiting on media</li>
                <li>{order.workflowSummary.mediaUploadedCount} media complete</li>
                <li>{order.workflowSummary.readyForDispatchCount} dispatch ready</li>
                <li>{order.workflowSummary.dispatchedCount} dispatched</li>
              </ul>
            ) : <p className="muted-copy">Load an order to inspect its workflow split.</p>}
          </section>
          <section className="rail-panel">
            <p className="eyebrow">Shortcuts</p>
            <div className="secondary-actions">
              <Link className="ghost-button" to={`/qr/${id}`}>Open QR workflow</Link>
              <Link className="ghost-button" to={`/media/${id}`}>Open media workflow</Link>
            </div>
          </section>
        </>
      )}
    >
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Order detail</p>
            <h2>{order?.salesOrderNumber ?? id}</h2>
            <p className="page-subtitle">Order-first view for customer, team assignment, and machine-unit drilldown.</p>
          </div>
          <div className="topbar-actions">
            <Link className="ghost-button" to="/orders">Back to orders</Link>
          </div>
        </header>

        {loading ? <section className="detail-panel"><p className="muted-copy">Loading order…</p></section> : null}

        {error && !loading ? (
          <section className="detail-panel" role="alert">
            <p className="eyebrow">Order unavailable</p>
            <h3>We could not load this order</h3>
            <p className="muted-copy">{error}</p>
          </section>
        ) : null}

        {order ? (
          <>
            <section className="machine-hero-grid">
              <div className="detail-panel">
                <p className="eyebrow">Customer context</p>
                <div className="machine-summary-grid">
                  <div><span className="meta-label">Customer</span><strong>{order.customerName}</strong></div>
                  <div><span className="meta-label">Destination</span><strong>{order.destination}</strong></div>
                  <div><span className="meta-label">Delivery</span><strong>{order.deliveryLabel}</strong></div>
                  <div><span className="meta-label">Status</span><strong>{order.status}</strong></div>
                </div>
              </div>

              <div className="detail-panel">
                <div className="detail-panel-header">
                  <div>
                    <p className="eyebrow">Team ownership</p>
                    <h3>{order.teamAssignment === 'TEAM_B' ? 'Team B' : 'Team A'}</h3>
                  </div>
                </div>
                <label className="stacked-field">
                  <span className="meta-label">Dispatch team</span>
                  <select value={order.teamAssignment ?? 'TEAM_A'} onChange={(event) => void handleTeamChange(event.target.value as TeamAssignment)} disabled={savingTeam}>
                    <option value="TEAM_A">Team A</option>
                    <option value="TEAM_B">Team B</option>
                  </select>
                </label>
                <p className="muted-copy">{savingTeam ? 'Saving assignment…' : 'Operators can move an order between teams without leaving the order workspace.'}</p>
              </div>
            </section>

            <section className="detail-panel">
              <div className="detail-panel-header">
                <div>
                  <p className="eyebrow">Machine units</p>
                  <h3>{order.machineUnits.length} units in this order</h3>
                </div>
              </div>
              <div className="order-list compact">
                {order.machineUnits.map((machine) => (
                  <article className="order-list-card compact" key={machine.id}>
                    <div className="order-list-card-main">
                      <div>
                        <p className="eyebrow">{machine.id}</p>
                        <h3>{machine.productName}</h3>
                        <p className="muted-copy">Qty {machine.quantity}{machine.sku ? ` • ${machine.sku}` : ''}</p>
                      </div>
                      <div className="order-badges">
                        <span className={`pill ${machine.qrReady ? 'tone-live' : 'tone-urgent'}`}>{machine.qrReady ? 'QR ready' : 'QR pending'}</span>
                        <span className={`pill ${machine.mediaComplete ? 'tone-live' : 'tone-neutral'}`}>{machine.mediaComplete ? 'Media complete' : 'Media pending'}</span>
                      </div>
                    </div>
                    <div className="order-stats-grid">
                      <div><span className="meta-label">Serial</span><strong>{machine.serialNumber ?? 'Pending'}</strong></div>
                      <div><span className="meta-label">Videos</span><strong>{machine.videoCount}/{machine.requiredVideoCount}</strong></div>
                      <div><span className="meta-label">Workflow</span><strong>{machine.workflowStage}</strong></div>
                    </div>
                    <div className="order-card-actions">
                      <Link className="ghost-button" to={`/machine-units/${machine.id}`}>Machine detail</Link>
                      <Link className="ghost-button" to={`/qr/${order.id}`}>QR</Link>
                      <Link className="ghost-button" to={`/media/${order.id}`}>Media</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </OperationsLayout>
  );
}
