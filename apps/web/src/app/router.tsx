import { Navigate, type RouteObject } from 'react-router-dom'

import AlertDetailPage from '../features/alerts/AlertDetailPage'
import AlertsPage from '../features/alerts/AlertsPage'
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage'
import LoggedOutPage from '../features/auth/LoggedOutPage'
import LoginPage from '../features/auth/LoginPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import ResetPasswordPage from '../features/auth/ResetPasswordPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import HistoryPage from '../features/history/HistoryPage'
import LivePage from '../features/live/LivePage'
import PersonPage from '../features/person/PersonPage'
import SettingsPage from '../features/settings/SettingsPage'
import AppShell from '../layout/AppShell'

/** Route table (Frontend.md §3). Signed-in pages sit inside `RequireAuth` and `AppShell`. */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/logged-out', element: <LoggedOutPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/live', element: <LivePage /> },
          { path: '/alerts', element: <AlertsPage /> },
          { path: '/alerts/:id', element: <AlertDetailPage /> },
          { path: '/history', element: <HistoryPage /> },
          { path: '/runs/:runId/person/:trackId', element: <PersonPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
