import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-line bg-card', className)}>{children}</div>
}

interface CardHeaderProps {
  title: ReactNode
  /** Right side of the strip: a count, a camera name, a check code. */
  aside?: ReactNode
  icon?: ReactNode
  /** Heading level for the title. */
  as?: 'h2' | 'h3'
}

/** Title strip shared by every card, so all cards read the same. */
export function CardHeader({ title, aside, icon, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
      {icon}
      <Heading className="m-0 text-base font-semibold">{title}</Heading>
      {aside && <span className="ml-auto text-[13px] text-mute">{aside}</span>}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('p-5', className)}>{children}</div>
}
