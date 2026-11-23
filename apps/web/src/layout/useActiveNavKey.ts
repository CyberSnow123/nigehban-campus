import { useLocation } from 'react-router-dom'

import { isClosed, useAlert } from '../features/alerts/api'
import { navKeyFor, type NavKey } from './navItems'

const ALERT_DETAIL = /^\/alerts\/([^/]+)$/

/**
 * The highlighted nav item. A closed alert's detail page belongs to History, an open one (or one
 * still loading) to Alerts, as in the prototype. It reads the detail page's own alert query.
 */
export function useActiveNavKey(): NavKey | null {
  const { pathname } = useLocation()
  const match = ALERT_DETAIL.exec(pathname)
  const alert = useAlert(match?.[1] ?? '', { enabled: match !== null }).data
  if (match && alert && isClosed(alert)) return 'history'
  return navKeyFor(pathname)
}
