import type { ReactNode } from 'react'

import { NO_VALUE, type Tone } from '../lib/constants'
import { cx } from '../lib/cx'
import { Card } from './Card'

type TileTone = Tone | 'neutral'

const ICON_BOX: Record<TileTone, string> = {
  neutral: 'bg-soft text-ink',
  red: 'bg-red-bg text-red',
  pur: 'bg-pur-bg text-pur',
  amb: 'bg-amb-bg text-amb',
  grn: 'bg-grn-bg text-grn',
  gry: 'bg-soft text-grey',
  blu: 'bg-blu-bg text-blu',
}
const VALUE_COLOR: Partial<Record<TileTone, string>> = {
  red: 'text-red',
  amb: 'text-amb',
  grn: 'text-grn',
  blu: 'text-blu',
}

interface StatTileProps {
  label: string
  /** `undefined` shows a dash: the value has no source yet. */
  value?: ReactNode
  /** Small text after the value, e.g. "/ 4 online". */
  suffix?: ReactNode
  icon: ReactNode
  tone?: TileTone
  /** Extra row under the value (pills). */
  children?: ReactNode
}

export function StatTile({
  label,
  value,
  suffix,
  icon,
  tone = 'neutral',
  children,
}: StatTileProps) {
  const missing = value === undefined
  return (
    <Card className="flex justify-between gap-2 p-4 tab:gap-3 tab:p-5">
      <div>
        <span className="text-[13px] text-mute tab:text-sm">{label}</span>
        <b
          className={cx(
            'mt-1 block text-2xl leading-tight font-semibold tab:text-[30px]',
            VALUE_COLOR[tone],
          )}
        >
          {missing ? (
            <span role="img" aria-label="Not available yet">
              {NO_VALUE}
            </span>
          ) : (
            value
          )}
          {suffix && !missing && (
            <small className="ml-1 text-sm font-medium text-mute">{suffix}</small>
          )}
        </b>
        {children && <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>}
      </div>
      <div
        className={cx(
          'grid size-9 flex-none place-items-center rounded-lg tab:size-11',
          ICON_BOX[tone],
        )}
      >
        {icon}
      </div>
    </Card>
  )
}
