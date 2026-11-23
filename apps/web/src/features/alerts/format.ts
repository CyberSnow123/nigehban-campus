/** Small, pure formatters shared by the alert views. Unknown values become `undefined`, so
 * `KeyValue` shows its dash instead of an invented value. */
import { BAG_LABEL } from '../../lib/constants'
import type { Alert } from './api'

const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const SHORT_TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export function formatDateTime(iso: string | null | undefined): string | undefined {
  return iso ? DATE_TIME.format(new Date(iso)) : undefined
}

/** Compact date and time for table cells, e.g. ["Nov 23", "03:00 PM"]. */
export function formatShortDateTime(iso: string): [string, string] {
  const when = new Date(iso)
  return [SHORT_DATE.format(when), SHORT_TIME.format(when)]
}

export function seconds(value: number | null | undefined): string | undefined {
  return value == null ? undefined : `${Math.round(value)} s`
}

/** "45 s", "2 min 10 s", "1 h 5 min". */
export function duration(value: number | null | undefined): string | undefined {
  if (value == null) return undefined
  const total = Math.round(value)
  if (total < 60) return `${total} s`
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return minutes ? `${hours} h ${minutes} min` : `${hours} h`
  const rest = total % 60
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`
}

export function metres(value: number | null | undefined): string | undefined {
  return value == null ? undefined : `${value.toFixed(1)} m`
}

export function percent(value: number | null | undefined): string | undefined {
  return value == null ? undefined : `${Math.round(value * 100)}%`
}

/** "Handbag #18" */
export function bagName(alert: Pick<Alert, 'bag'>): string {
  return `${BAG_LABEL[alert.bag.class]} #${alert.bag.track_id}`
}

export function personPath(runId: string, trackId: number): string {
  return `/runs/${runId}/person/${trackId}`
}
