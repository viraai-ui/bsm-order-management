import { NavLink, Outlet } from 'react-router-dom';
import { OperationsLayout } from '../../components/OperationsLayout';

export function SettingsLayout() {
  return (
    <OperationsLayout rail={<section className="rail-panel"><p className="eyebrow">Settings</p><p className="muted-copy">Operational admin screens live here. Users and sync logs are wired now, even before the backend is fully polished.</p></section>}>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Operations admin</h2>
          </div>
        </header>
        <section className="detail-panel settings-shell">
          <nav className="settings-nav" aria-label="Settings navigation">
            <NavLink className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} to="/settings/users">Users</NavLink>
            <NavLink className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} to="/settings/sync-logs">Sync Logs</NavLink>
          </nav>
          <div className="settings-content">
            <Outlet />
          </div>
        </section>
      </main>
    </OperationsLayout>
  );
}
