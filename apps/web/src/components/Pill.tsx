import type { ReactNode } from 'react'

import {
  STATUS_PILL,
  TYPE_PILL,
  type AlertStatus,
  type AlertType,
  type Tone,
} from '../lib/constants'
import { cx } from '../lib/cx'

const TONE: Record<Tone, string> = {
  red: 'bg-red-bg text-red',
  pur: 'bg-pur-bg text-pur',
  amb: 'bg-amb-bg text-amb',
  grn: 'bg-grn-bg text-grn',
  gry: 'bg-soft text-grey',
  blu: 'bg-blu-bg text-blu',
}

/** Rounded label with a dot. Always carries text, so colour is never the only signal. */
export function Pill({
  tone,
  children,
  small,
}: {
  tone: Tone
  children: ReactNode
  /** 11 px text, for pills inside a small panel. */
  small?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap',
        small ? 'text-[11px]' : 'text-[13px]',
        'before:size-1.5 before:rounded-full before:bg-current',
        TONE[tone],
      )}
    >
      {children}
    </span>
  )
}

export function TypePill({ type }: { type: AlertType }) {
  const { label, tone } = TYPE_PILL[type]
  return <Pill tone={tone}>{label}</Pill>
}

export function StatusPill({ status }: { status: AlertStatus }) {
  const { label, tone } = STATUS_PILL[status]
  return <Pill tone={tone}>{label}</Pill>
}

/** Marks anything produced by the mock source (D-06). Never hide it. */
export function DemoBadge() {
  return (
    <Pill tone="amb">
      <span title="Produced by a mock source, not a real detection">Demo data</span>
    </Pill>
  )
}
