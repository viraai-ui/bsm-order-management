import type { ReactElement } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './features/auth/AuthGuard';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DispatchBoardPage } from './features/dispatch/DispatchBoardPage';
import { MediaOrderDetailPage } from './features/media/MediaOrderDetailPage';
import { MediaOrdersPage } from './features/media/MediaOrdersPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { QrOrderDetailPage } from './features/qr/QrOrderDetailPage';
import { QrOrdersPage } from './features/qr/QrOrdersPage';
import { SettingsLayout } from './features/settings/SettingsLayout';
import { SyncLogsPage } from './features/settings/SyncLogsPage';
import { UsersPage } from './features/settings/UsersPage';
import { MachineUnitPage } from './pages/MachineUnitPage';

function protectedRoute(element: ReactElement) {
  return <AuthGuard>{element}</AuthGuard>;
}

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
    element: protectedRoute(<DashboardPage />),
  },
  {
    path: '/orders',
    element: protectedRoute(<OrdersPage />),
  },
  {
    path: '/orders/:id',
    element: protectedRoute(<OrderDetailPage />),
  },
  {
    path: '/qr',
    element: protectedRoute(<QrOrdersPage />),
  },
  {
    path: '/qr/:id',
    element: protectedRoute(<QrOrderDetailPage />),
  },
  {
    path: '/dispatch',
    element: protectedRoute(<DispatchBoardPage />),
  },
  {
    path: '/media',
    element: protectedRoute(<MediaOrdersPage />),
  },
  {
    path: '/media/:id',
    element: protectedRoute(<MediaOrderDetailPage />),
  },
  {
    path: '/settings',
    element: protectedRoute(<SettingsLayout />),
    children: [
      {
        index: true,
        element: <Navigate to="/settings/users" replace />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'sync-logs',
        element: <SyncLogsPage />,
      },
    ],
  },
  {
    path: '/machine-units/:id',
    element: protectedRoute(<MachineUnitPage />),
  },
]);
