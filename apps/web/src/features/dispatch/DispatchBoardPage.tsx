import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';
import { fetchDispatchOrdersByTeam, type DispatchOrdersByTeam, type TeamAssignment } from '../../lib/apiClient';

const teamMeta: Record<TeamAssignment, { title: string; tone: string }> = {
  TEAM_A: { title: 'Team A', tone: 'tone-live' },
  TEAM_B: { title: 'Team B', tone: 'tone-urgent' },
};

export function DispatchBoardPage() {
  const [board, setBoard] = useState<DispatchOrdersByTeam>({ TEAM_A: [], TEAM_B: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setBoard(await fetchDispatchOrdersByTeam());
    } catch (loadError) {
      setBoard({ TEAM_A: [], TEAM_B: [] });
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dispatch board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return (
    <OperationsLayout rail={<section className="rail-panel"><p className="eyebrow">Dispatch board</p><p className="muted-copy">Split by team so floor staff can work separate sales-order lanes.</p></section>}>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dispatch</p>
            <h2>Team split board</h2>
            <p className="page-subtitle">Order-first dispatch queue, grouped by team assignment.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => void loadBoard()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh board'}
          </button>
        </header>

        {error ? <section className="detail-panel" role="alert"><p className="muted-copy">{error}</p></section> : null}

        <section className="team-board-grid">
          {(Object.keys(teamMeta) as TeamAssignment[]).map((team) => (
            <section className="team-board" key={team}>
              <div className="bucket-header">
                <div>
                  <p className="bucket-kicker">Dispatch lane</p>
                  <h3>{teamMeta[team].title}</h3>
                </div>
                <span className={`bucket-count ${teamMeta[team].tone}`}>{board[team].length}</span>
              </div>

              <div className="order-list compact">
                {loading ? <p className="muted-copy">Loading…</p> : null}
                {!loading && board[team].length === 0 ? <p className="muted-copy">No assigned orders in this lane.</p> : null}
                {board[team].map((order) => (
                  <article className="order-list-card compact" key={order.id}>
                    <div className="order-list-card-main">
                      <div>
                        <p className="eyebrow">{order.salesOrderNumber}</p>
                        <h3>{order.customerName}</h3>
                        <p className="muted-copy">{order.destination} • {order.deliveryLabel}</p>
                      </div>
                      <span className={`pill ${order.status === 'Dispatch ready' ? 'tone-live' : order.status === 'Dispatched' ? 'tone-muted' : 'tone-neutral'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="order-stats-grid">
                      <div><span className="meta-label">Units</span><strong>{order.machineUnitCount}</strong></div>
                      <div><span className="meta-label">QR ready</span><strong>{order.qrCodeCount}</strong></div>
                      <div><span className="meta-label">Videos</span><strong>{order.videoCount}/{order.requiredVideoCount}</strong></div>
                    </div>
                    <div className="order-card-actions">
                      <Link className="ghost-button" to={`/orders/${order.id}`}>Order</Link>
                      <Link className="ghost-button" to={`/media/${order.id}`}>Media</Link>
                      <Link className="ghost-button" to={`/qr/${order.id}`}>QR</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      </main>
    </OperationsLayout>
  );
}
