import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

/** A message for a section that has nothing to show yet. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('px-6 py-8 text-center', className)}>
      <p className="m-0 font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-mute">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
