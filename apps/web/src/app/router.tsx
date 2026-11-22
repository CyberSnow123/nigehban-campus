import { Navigate, type RouteObject } from 'react-router-dom'

import ForgotPasswordPage from '../features/auth/ForgotPasswordPage'
import LoggedOutPage from '../features/auth/LoggedOutPage'
import LoginPage from '../features/auth/LoginPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import ResetPasswordPage from '../features/auth/ResetPasswordPage'
import HomePage from './HomePage'

/** Route table (Frontend.md §3). Later phases add their pages inside `RequireAuth`. */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/logged-out', element: <LoggedOutPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { element: <RequireAuth />, children: [{ path: '/', element: <HomePage /> }] },
  { path: '*', element: <Navigate to="/" replace /> },
]
