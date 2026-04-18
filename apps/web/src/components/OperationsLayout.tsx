import type { PropsWithChildren, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const navItems: Array<{ label: string; to: string; end?: boolean }> = [
  { label: 'Dashboard', to: '/dashboard', end: true },
  { label: 'Orders', to: '/orders' },
  { label: 'QR Code Generator', to: '/qr' },
  { label: 'Dispatch', to: '/dispatch' },
  { label: 'Media', to: '/media' },
  { label: 'Settings', to: '/settings' },
];

type OperationsLayoutProps = PropsWithChildren<{
  rail?: ReactNode;
  hideRail?: boolean;
}>;

export function OperationsLayout({ children, rail, hideRail = false }: OperationsLayoutProps) {
  return (
    <div className={hideRail ? 'dashboard-shell dashboard-shell--no-rail' : 'dashboard-shell'}>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">BSM Ops</p>
          <h1>Dispatch OS</h1>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {children}

      {hideRail ? null : (
        <aside className="rail">
          {rail ?? (
            <section className="rail-panel">
              <p className="eyebrow">Status</p>
              <h3>Coming soon</h3>
              <p className="muted-copy">This section is wired into navigation now. The full workflow screen has not been built yet.</p>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
