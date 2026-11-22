import { cx } from '../lib/cx'
import { KeyValue } from './KeyValue'

const BAR_TONE = { red: 'bg-red', amb: 'bg-amb', grn: 'bg-grn' } as const

/** Prototype `.bar`: thin progress track. `value` is 0 to 100. */
export function ProgressBar({
  value,
  tone,
  label,
}: {
  value: number
  tone: keyof typeof BAR_TONE
  label: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2 overflow-hidden rounded-full bg-track"
    >
      <i className={cx('block h-full rounded-full', BAR_TONE[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export interface DonutSegment {
  label: string
  value: number
  /** Stroke colour from the prototype palette (a CSS variable or one of its hex values). */
  color: string
}

/** Prototype "Today's alerts" donut with its legend. Empty data shows a bare ring. */
export function Donut({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  // Each arc starts where the previous one ended.
  const arcs = segments.map((segment, i) => ({
    segment,
    length: total ? (segment.value / total) * 100 : 0,
    start: segments.slice(0, i).reduce((sum, s) => sum + (total ? (s.value / total) * 100 : 0), 0),
  }))
  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox="0 0 40 40"
        width="120"
        height="120"
        className="flex-none"
        role="img"
        aria-label={`${total} alerts in total`}
      >
        <circle r="15.9" cx="20" cy="20" fill="none" stroke="var(--color-track)" strokeWidth="6" />
        {arcs.map(({ segment, length, start }) => (
          <circle
            key={segment.label}
            r="15.9"
            cx="20"
            cy="20"
            fill="none"
            stroke={segment.color}
            strokeWidth="6"
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={25 - start}
          />
        ))}
        <text x="20" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--ink)">
          {total}
        </text>
      </svg>
      <div className="flex-1">
        {segments.map((s) => (
          <KeyValue key={s.label} label={s.label}>
            {s.value}
          </KeyValue>
        ))}
      </div>
    </div>
  )
}
