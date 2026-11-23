/** Dashboard and History counters (Data-Contracts §5: Stats, HistoryStats). */
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api/client'
import { POLL_MS, retryOnce, SLOW_POLL_MS, unwrap } from '../../lib/api/query'
import type { AlertType } from '../../lib/constants'

export type HistoryDays = 1 | 7 | 30

export const statsKeys = {
  dashboard: ['stats'] as const,
  history: (days: HistoryDays, type?: AlertType) => ['stats', 'history', days, type] as const,
}

const fetchStats = () => unwrap(api.GET('/api/stats'), 'Could not load the counters.')
const fetchHistoryStats = (days: HistoryDays, type?: AlertType) =>
  unwrap(
    api.GET('/api/stats/history', { params: { query: { days, type } } }),
    'Could not load the history counters.',
  )

export type Stats = Awaited<ReturnType<typeof fetchStats>>
export type LatestAlert = NonNullable<Stats['latest_alert']>
export type HistoryStats = Awaited<ReturnType<typeof fetchHistoryStats>>

/** One shared poll: the shell, the toast and the Dashboard all read this query. */
export function useStats() {
  return useQuery({
    queryKey: statsKeys.dashboard,
    queryFn: fetchStats,
    refetchInterval: POLL_MS,
    retry: retryOnce,
  })
}

export function useHistoryStats(days: HistoryDays, type?: AlertType) {
  return useQuery({
    queryKey: statsKeys.history(days, type),
    queryFn: () => fetchHistoryStats(days, type),
    placeholderData: keepPreviousData,
    refetchInterval: SLOW_POLL_MS,
    retry: retryOnce,
  })
}
