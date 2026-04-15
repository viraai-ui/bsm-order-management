import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './features/auth/AuthGuard';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';
import { MachineUnitPage } from './pages/MachineUnitPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/orders',
    element: (
      <AuthGuard>
        <PlaceholderPage
          section="Orders"
          description="Order management is still being built. For now, use the dispatch dashboard and machine unit detail views for live work."
        />
      </AuthGuard>
    ),
  },
  {
    path: '/machine-units',
    element: (
      <AuthGuard>
        <PlaceholderPage
          section="Machine Units"
          description="A machine unit list view is not in this frontend yet, but machine unit detail pages remain available from dispatch cards."
        />
      </AuthGuard>
    ),
  },
  {
    path: '/dispatch',
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/media',
    element: (
      <AuthGuard>
        <PlaceholderPage
          section="Media"
          description="Media management will land in a dedicated screen later. Existing media upload and removal still work inside machine unit detail pages."
        />
      </AuthGuard>
    ),
  },
  {
    path: '/users',
    element: (
      <AuthGuard>
        <PlaceholderPage
          section="Users"
          description="User administration has a route now so navigation works, but the full management UI has not been implemented yet."
        />
      </AuthGuard>
    ),
  },
  {
    path: '/sync-logs',
    element: (
      <AuthGuard>
        <PlaceholderPage
          section="Sync Logs"
          description="Sync logs are not exposed in a standalone page yet. Use the dashboard summary until the full log explorer is added."
        />
      </AuthGuard>
    ),
  },
  {
    path: '/machine-units/:id',
    element: (
      <AuthGuard>
        <MachineUnitPage />
      </AuthGuard>
    ),
  },
]);
