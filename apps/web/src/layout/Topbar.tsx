import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { BellIcon, SearchIcon } from '../components/icons'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../features/auth/useAuth'
import { ROLE_LABEL } from '../lib/constants'
import { initials } from './initials'
import type { ShellStatus } from './useShellStatus'

/**
 * Search box. On History it searches History and keeps its other filters; anywhere else it opens
 * the Alerts list filtered by the text (phase-08 decision 4).
 */
function SearchForm() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const q = text.trim()
    const onHistory = pathname.startsWith('/history')
    const next = onHistory ? new URLSearchParams(params) : new URLSearchParams()
    next.delete('page')
    if (q) next.set('q', q)
    else next.delete('q')
    const search = next.toString()
    navigate(`${onHistory ? '/history' : '/alerts'}${search ? `?${search}` : ''}`)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="relative max-w-[480px] flex-1">
      <SearchIcon className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-mute" />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search e.g. Person #12, Bag #31, CAM 03"
        title="Try: Person #12, person 2, P7, Bag #31, library, theft"
        aria-label="Search"
        className="min-h-11 w-full rounded-lg border border-line bg-wash pr-3.5 pl-10"
      />
    </form>
  )
}

export function Topbar({ status }: { status: ShellStatus }) {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-[4] flex items-center gap-3.5 border-b border-line bg-card px-[clamp(16px,3vw,40px)] py-3.5">
      <SearchForm />
      <ThemeToggle className="ml-auto" />
      <Link
        to="/alerts"
        aria-label={status.openAlerts > 0 ? `Alerts, ${status.openAlerts} open` : 'Alerts'}
        className="relative grid size-11 flex-none place-items-center rounded-lg text-mute hover:bg-soft hover:text-ink"
      >
        <BellIcon className="size-5" />
        {status.openAlerts > 0 && (
          <i className="absolute top-2 right-2.5 size-2 rounded-full bg-red" aria-hidden="true" />
        )}
      </Link>
      {user && (
        <div className="flex items-center gap-2.5 tab:border-l tab:border-line tab:pl-3.5">
          <Link
            to="/settings"
            aria-label="Account settings"
            className="grid size-10 flex-none place-items-center rounded-full bg-navy text-sm font-bold text-white"
          >
            {initials(user.display_name)}
          </Link>
          <div className="hidden tab:block">
            <b className="block text-sm">{user.display_name}</b>
            <small className="text-xs text-mute">{ROLE_LABEL[user.role]}</small>
          </div>
        </div>
      )}
    </header>
  )
}
