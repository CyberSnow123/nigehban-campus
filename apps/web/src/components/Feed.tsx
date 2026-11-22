import { useState, type ReactNode } from 'react'

import { cx } from '../lib/cx'
import { Card } from './Card'

/** Dark 16:9 frame (prototype `.feed`). With no `children` it says why it is empty. */
export function Feed({
  children,
  emptyText,
  small,
}: {
  children?: ReactNode
  emptyText: string
  small?: boolean
}) {
  return (
    <div
      className={cx(
        'relative grid aspect-video place-items-center overflow-hidden bg-feed text-sm text-mute',
        small && 'rounded-lg',
      )}
    >
      {children ?? <span className="px-4 text-center">{emptyText}</span>}
    </div>
  )
}

interface FeedCardProps {
  title: ReactNode
  /** Small mono tag after the title, e.g. "1080p · 30 FPS". */
  tag?: ReactNode
  /** Right side of the header, usually a status pill. */
  status?: ReactNode
  /** Blinking red dot before the title: a live camera. */
  live?: boolean
  icon?: ReactNode
  /** The picture area. */
  children: ReactNode
  /** Chips and buttons under the picture. */
  footer?: ReactNode
}

/** Camera card: header strip, picture, footer (prototype `.cam-h`, `.feed`, `.cam-f`). */
export function FeedCard({ title, tag, status, live, icon, children, footer }: FeedCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3.5">
        {live && (
          <span
            className="size-2.5 animate-blink rounded-full bg-red motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {icon}
        <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
        {tag && <span className="rounded-md bg-soft px-2 py-0.5 font-mono text-xs">{tag}</span>}
        {status && <span className="ml-auto">{status}</span>}
      </div>
      {children}
      {footer && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-[13px] text-mute">
          {footer}
        </div>
      )}
    </Card>
  )
}

/** Coloured dot + text chip in a feed footer (prototype `.k`). `color` is a palette value. */
export function FeedChip({
  color,
  children,
  mono,
}: {
  color: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', mono && 'font-mono')}>
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  )
}

type SnapshotState = 'loading' | 'error' | 'empty'

/**
 * An alert snapshot. Pass a `src` for a ready image, or a `state` while there is none.
 * Loading the authenticated image itself is Phase 7.
 */
export function Snapshot({
  src,
  alt,
  state = 'empty',
}: {
  src?: string
  alt: string
  state?: SnapshotState
}) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <Feed emptyText="">
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      </Feed>
    )
  }
  const text =
    failed || state === 'error'
      ? 'Snapshot unavailable'
      : state === 'loading'
        ? 'Loading snapshot…'
        : 'No snapshot'
  return <Feed emptyText={text} />
}
