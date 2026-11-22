import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { MobileTabBar } from './MobileTabBar'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useShellStatus } from './useShellStatus'

/** Sidebar + topbar + page area for every signed-in screen. */
export default function AppShell() {
  const status = useShellStatus()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const shownPath = useRef(pathname)

  // After a route change, scroll to the top and move focus to the page so keyboard and
  // screen-reader users start at the top of the new content. Not on first load, where the skip
  // link comes first. Comparing paths (not a "first render" flag) keeps this correct when React
  // StrictMode runs effects twice in development. `preventScroll` stops the browser from
  // scrolling the page's top edge underneath the sticky topbar.
  useEffect(() => {
    if (shownPath.current === pathname) return
    shownPath.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="grid min-h-screen tab:grid-cols-[270px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-20 rounded-lg bg-navy px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <Sidebar status={status} />
      <div>
        <Topbar status={status} />
        <main
          id="main"
          ref={main}
          tabIndex={-1}
          className="px-[clamp(16px,3vw,40px)] pt-7 pb-24 outline-none tab:pb-16"
        >
          <Outlet />
        </main>
      </div>
      <MobileTabBar status={status} />
      {/* New-alert announcements land here in Phase 8. */}
      <div role="status" aria-live="polite" className="sr-only" />
    </div>
  )
}
