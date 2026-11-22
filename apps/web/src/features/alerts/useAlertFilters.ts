import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { AlertType } from '../../lib/constants'

export type TypeFilterValue = 'all' | AlertType
export type StatusFilterValue = 'all' | 'active' | 'acknowledged' | 'closed'

const TYPES: readonly TypeFilterValue[] = ['all', 'abandoned_bag', 'possible_theft']
const STATUSES: readonly StatusFilterValue[] = ['all', 'active', 'acknowledged', 'closed']

function pick<T extends string>(allowed: readonly T[], raw: string | null): T {
  return allowed.find((value) => value === raw) ?? allowed[0]!
}

/**
 * Alert list filters, kept in the address (`/alerts?type=possible_theft&status=active&q=bag 31`)
 * so a filtered list can be reloaded, shared and reached from the topbar search.
 * Unknown values fall back to "all".
 */
export function useAlertFilters() {
  const [params, setParams] = useSearchParams()
  const type = pick(TYPES, params.get('type'))
  const status = pick(STATUSES, params.get('status'))
  const q = params.get('q') ?? ''

  const update = useCallback(
    (key: 'type' | 'status' | 'q', value: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value === '' || value === 'all') next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { type, status, q, update }
}
