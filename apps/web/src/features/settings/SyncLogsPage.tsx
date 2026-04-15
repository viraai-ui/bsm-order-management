import { useCallback, useEffect, useState } from 'react';
import { fetchSyncLogs, type SyncLogRecord } from '../../lib/apiClient';

export function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setLogs(await fetchSyncLogs());
    } catch (loadError) {
      setLogs([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <section className="settings-panel">
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">Sync logs</p>
          <h3>Recent sync activity</h3>
        </div>
      </div>
      {error ? <p className="muted-copy" role="alert">{error}</p> : null}
      {loading ? <p className="muted-copy">Loading sync logs…</p> : null}
      <div className="settings-list">
        {logs.map((log) => (
          <article className="settings-row" key={log.id}>
            <div>
              <strong>{log.source}</strong>
              <p className="muted-copy">{log.summary}</p>
            </div>
            <div className="order-badges">
              <span className={`pill ${log.status === 'Success' ? 'tone-live' : log.status === 'Blocked' ? 'tone-urgent' : 'tone-neutral'}`}>{log.status}</span>
              <span className="pill tone-muted">{log.happenedAt.replace('T', ' ').replace('Z', ' UTC')}</span>
            </div>
          </article>
        ))}
      </div>
      <p className="muted-copy">Read-only fallback data is shown until the dedicated sync log explorer lands on the backend.</p>
    </section>
  );
}
