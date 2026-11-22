import type { ReactNode } from 'react'

import { NO_VALUE } from '../lib/constants'
import { cx } from '../lib/cx'

/** One label/value row. `hot` highlights a value that crossed its threshold. */
export function KeyValue({
  label,
  children,
  hot,
  mono,
}: {
  label: string
  /** `undefined` shows a dash. */
  children?: ReactNode
  hot?: boolean
  mono?: boolean
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-b-0',
        hot && '-mx-3 rounded-lg border-b-0 bg-red-bg px-3',
      )}
    >
      <span className="text-mute">{label}</span>
      <b className={cx('text-right font-semibold', mono && 'font-mono')}>{children ?? NO_VALUE}</b>
    </div>
  )
}
