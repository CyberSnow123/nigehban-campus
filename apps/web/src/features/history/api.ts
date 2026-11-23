import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { retryOnce, SLOW_POLL_MS } from '../../lib/api/query'
import { fetchAlerts, type AlertListParams } from '../alerts/api'
import type { HistoryFilters } from './useHistoryFilters'

export const HISTORY_PAGE_SIZE = 20
const DAY_MS = 24 * 60 * 60 * 1000

export type HistoryQuery = Pick<HistoryFilters, 'type' | 'outcome' | 'days' | 'q' | 'page'>

/** The list request for the filters. `from` is worked out from the clock at fetch time. */
export function historyParams(filters: HistoryQuery, now: number): AlertListParams {
  return {
    status: filters.outcome === 'all' ? 'closed' : filters.outcome,
    type: filters.type === 'all' ? undefined : filters.type,
    q: filters.q || undefined,
    from: new Date(now - filters.days * DAY_MS).toISOString(),
    page: filters.page,
    page_size: HISTORY_PAGE_SIZE,
  }
}

/**
 * Closed alerts for the History table. The key holds the filters, not `from`, so it stays the
 * same between polls while each fetch still uses "now". It starts with `alerts`, so an alert
 * action reloads it like every other list.
 */
export function useHistoryAlerts(filters: HistoryQuery) {
  return useQuery({
    queryKey: ['alerts', 'history', filters],
    queryFn: () => fetchAlerts(historyParams(filters, Date.now())),
    placeholderData: keepPreviousData,
    refetchInterval: SLOW_POLL_MS,
    retry: retryOnce,
  })
}
