import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

/** Layout route: everything inside needs a logged-in user. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <p role="status" className="grid min-h-screen place-items-center text-mute">
        Checking your session…
      </p>
    )
  }
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <Outlet />
}

/** Layout route for admin-only pages (used from Phase 12). Operators see a clear message. */
export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'admin') {
    return (
      <p role="alert" className="p-8 text-mute">
        Only administrators can open this page.
      </p>
    )
  }
  return <Outlet />
}
