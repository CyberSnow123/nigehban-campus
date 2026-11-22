import type { ComponentType } from 'react'

import { AlertIcon, CameraIcon, ClockIcon, DashboardIcon, SettingsIcon } from '../components/icons'

export type NavKey = 'dashboard' | 'live' | 'alerts' | 'history' | 'settings'

export interface NavItem {
  key: NavKey
  to: string
  /** Sidebar label. */
  label: string
  /** Bottom-tab label (the prototype shortens "Live Monitoring" to "Live"). */
  tabLabel: string
  Icon: ComponentType<{ className?: string }>
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', to: '/', label: 'Dashboard', tabLabel: 'Dashboard', Icon: DashboardIcon },
  { key: 'live', to: '/live', label: 'Live Monitoring', tabLabel: 'Live', Icon: CameraIcon },
  { key: 'alerts', to: '/alerts', label: 'Alerts', tabLabel: 'Alerts', Icon: AlertIcon },
  { key: 'history', to: '/history', label: 'History', tabLabel: 'History', Icon: ClockIcon },
  { key: 'settings', to: '/settings', label: 'Settings', tabLabel: 'Settings', Icon: SettingsIcon },
]

/** Which nav item a path belongs to. Alert details and person pages count as Alerts. */
export function navKeyFor(pathname: string): NavKey | null {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/live')) return 'live'
  if (pathname.startsWith('/alerts') || pathname.startsWith('/runs/')) return 'alerts'
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/settings')) return 'settings'
  return null
}
