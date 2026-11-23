import { Link } from 'react-router-dom'

import { IconButton } from '../components/Button'
import { LogoutIcon } from '../components/icons'
import { Logo } from '../components/Logo'
import { useAuth } from '../features/auth/useAuth'
import { useLogoutNavigate } from '../features/auth/useLogoutNavigate'
import { ROLE_LABEL } from '../lib/constants'
import { cx } from '../lib/cx'
import { initials } from './initials'
import { NAV_ITEMS } from './navItems'
import { useActiveNavKey } from './useActiveNavKey'
import type { ShellStatus } from './useShellStatus'

function NavList({ status }: { status: ShellStatus }) {
  const active = useActiveNavKey()
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3.5 py-4">
      {NAV_ITEMS.map(({ key, to, label, Icon }) => (
        <Link
          key={key}
          to={to}
          aria-current={active === key ? 'page' : undefined}
          className={cx(
            'flex min-h-11 items-center gap-3 rounded-lg px-3.5 font-medium',
            active === key ? 'bg-navy text-white' : 'text-slate-ink hover:bg-soft',
          )}
        >
          <Icon />
          {label}
          {key === 'live' && status.hasLiveRun && (
            <span
              className="ml-auto size-2 rounded-full bg-live"
              role="img"
              aria-label="A run is active"
            />
          )}
          {key === 'alerts' && status.openAlerts > 0 && (
            <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-red px-1.5 text-xs font-bold text-on-solid">
              <span className="sr-only">Open alerts: </span>
              {status.openAlerts}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

function UserBlock() {
  const { user } = useAuth()
  const logout = useLogoutNavigate()
  if (!user) return null
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-line p-4">
      <div
        className="grid size-10 flex-none place-items-center rounded-full bg-navy text-sm font-bold text-white"
        aria-hidden="true"
      >
        {initials(user.display_name)}
      </div>
      <div className="min-w-0">
        <b className="block truncate text-sm">{user.display_name}</b>
        <small className="text-xs text-mute">{ROLE_LABEL[user.role]}</small>
      </div>
      <IconButton label="Log out" onClick={logout} className="ml-auto">
        <LogoutIcon className="size-5" />
      </IconButton>
    </div>
  )
}

/** Fixed 270 px column on desktop. Hidden under 760 px, where `MobileTabBar` takes over. */
export function Sidebar({ status }: { status: ShellStatus }) {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-card tab:flex">
      <div className="flex items-center gap-3 border-b border-line px-5 py-5">
        <Logo />
        <div>
          <b className="block text-[17px] font-semibold">Nigehban Campus</b>
          <small className="text-[11px] font-semibold tracking-[0.06em] text-mute">
            AI SURVEILLANCE SUITE
          </small>
        </div>
      </div>
      <NavList status={status} />
      <UserBlock />
    </aside>
  )
}
