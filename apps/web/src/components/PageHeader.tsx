import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PageHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** Pill beside the title, e.g. "System online". */
  badge?: ReactNode
  /** Controls on the right (segmented control, selects). */
  right?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)] leading-tight font-semibold tracking-tight">
          {title}
          {badge && <span className="ml-3 align-middle text-[13px] font-normal">{badge}</span>}
        </h1>
        {subtitle && <p className="mt-1 text-mute">{subtitle}</p>}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2.5">{right}</div>}
    </header>
  )
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-2 inline-flex min-h-11 items-center gap-1.5 font-medium text-mute hover:text-ink"
    >
      <span aria-hidden="true">←</span> {children}
    </Link>
  )
}
