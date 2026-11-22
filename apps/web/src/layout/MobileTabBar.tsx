import { Link, useLocation } from 'react-router-dom'

import { cx } from '../lib/cx'
import { NAV_ITEMS, navKeyFor } from './navItems'
import type { ShellStatus } from './useShellStatus'

/** Bottom tabs, shown under 760 px in place of the sidebar. */
export function MobileTabBar({ status }: { status: ShellStatus }) {
  const active = navKeyFor(useLocation().pathname)
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-card px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] tab:hidden"
    >
      {NAV_ITEMS.map(({ key, to, tabLabel, Icon }) => (
        <Link
          key={key}
          to={to}
          aria-current={active === key ? 'page' : undefined}
          className={cx(
            'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
            active === key ? 'font-bold text-navy' : 'text-mute',
          )}
        >
          <Icon className="size-[22px]" />
          {tabLabel}
          {key === 'alerts' && status.openAlerts > 0 && (
            <span className="absolute top-0.5 left-[calc(50%+6px)] rounded-full bg-red px-1.5 text-[10px] font-bold text-on-solid">
              <span className="sr-only">Open alerts: </span>
              {status.openAlerts}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
