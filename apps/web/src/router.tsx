import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './features/auth/AuthGuard';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';
import { MachineUnitPage } from './pages/MachineUnitPage';

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
    path: '/machine-units/:id',
    element: (
      <AuthGuard>
        <MachineUnitPage />
      </AuthGuard>
    ),
  },
]);
