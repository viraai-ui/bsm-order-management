import { useCallback, useEffect, useState } from 'react';
import { fetchSettingsUsers, type SettingsUser } from '../../lib/apiClient';

export function UsersPage() {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setUsers(await fetchSettingsUsers());
    } catch (loadError) {
      setUsers([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <section className="settings-panel">
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">Users</p>
          <h3>Signed-in operators</h3>
        </div>
      </div>
      {error ? <p className="muted-copy" role="alert">{error}</p> : null}
      {loading ? <p className="muted-copy">Loading users…</p> : null}
      <div className="settings-list">
        {users.map((user) => (
          <article className="settings-row" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <p className="muted-copy">{user.email}</p>
            </div>
            <div className="order-badges">
              <span className="pill tone-live">{user.status}</span>
              <span className="pill tone-neutral">{user.role}</span>
            </div>
          </article>
        ))}
      </div>
      <p className="muted-copy">This is a safe scaffold. Expand it when the dedicated users API is ready.</p>
    </section>
  );
}
