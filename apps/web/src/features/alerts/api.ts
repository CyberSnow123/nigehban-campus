/** Alert data for the alert views. All calls go through `lib/api/client`. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api/client'
import { POLL_MS, retryOnce, unwrap, type Result } from '../../lib/api/query'
import type { paths } from '../../lib/api/schema'
import type { AlertStatus } from '../../lib/constants'
import { useAuthedImage } from '../../lib/useAuthedImage'

export { ApiFailure } from '../../lib/api/query'

export type AlertListParams = NonNullable<paths['/api/alerts']['get']['parameters']['query']>
export type CloseOutcome = Exclude<AlertStatus, 'active' | 'acknowledged'>

export const alertKeys = {
  lists: ['alerts'] as const,
  list: (params: AlertListParams) => ['alerts', params] as const,
  one: (id: string) => ['alert', id] as const,
  actions: (id: string) => ['alert', id, 'actions'] as const,
  snapshot: (id: string) => ['alert', id, 'snapshot'] as const,
}

/** How often a query refreshes: milliseconds, or `false` for never. */
export interface PollOptions {
  interval?: number | false
}

// Fetchers. The read types come from them, because openapi-fetch's response types differ
// slightly from `components['schemas']` (a fixed-length `bbox` becomes `number[]`).
export const fetchAlerts = (params: AlertListParams) =>
  unwrap(api.GET('/api/alerts', { params: { query: params } }), 'Could not load alerts.')
const fetchAlert = (id: string) =>
  unwrap(
    api.GET('/api/alerts/{alert_id}', { params: { path: { alert_id: id } } }),
    'Could not load this alert.',
  )
const fetchActions = (id: string) =>
  unwrap(
    api.GET('/api/alerts/{alert_id}/actions', { params: { path: { alert_id: id } } }),
    'Could not load the timeline.',
  )

export type Alert = Awaited<ReturnType<typeof fetchAlert>>
export type AlertAction = Awaited<ReturnType<typeof fetchActions>>[number]

/** A page of alerts. Polls every 3 s unless told otherwise; keeps the old rows while loading. */
export function useAlerts(params: AlertListParams, { interval = POLL_MS }: PollOptions = {}) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => fetchAlerts(params),
    placeholderData: keepPreviousData, // no flicker on a new filter or a poll
    refetchInterval: interval,
    retry: retryOnce,
  })
}

/** How many alerts match, read from the list's `total` (one row is fetched). */
export function useAlertCount(filters: Omit<AlertListParams, 'page' | 'page_size'> = {}) {
  return useAlerts({ ...filters, page_size: 1 }).data?.total
}

export function useAlert(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: alertKeys.one(id),
    queryFn: () => fetchAlert(id),
    enabled,
    refetchInterval: POLL_MS,
    retry: retryOnce,
  })
}

export function useAlertActions(id: string, enabled = true) {
  return useQuery({
    queryKey: alertKeys.actions(id),
    queryFn: () => fetchActions(id),
    enabled,
    refetchInterval: POLL_MS,
    retry: retryOnce,
  })
}

export function useAlertSnapshot(id: string, enabled: boolean) {
  return useAuthedImage(
    alertKeys.snapshot(id),
    () =>
      unwrap(
        api.GET('/api/alerts/{alert_id}/snapshot', {
          params: { path: { alert_id: id } },
          parseAs: 'blob',
        }) as Promise<Result<Blob>>,
        'Snapshot not available.',
      ),
    enabled,
  )
}

export type AlertMove =
  { kind: 'acknowledge' } | { kind: 'close'; outcome: CloseOutcome; note?: string }

/** Acknowledge or close. On success the alert, its timeline, every list and the counters reload. */
export function useAlertMove(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (move: AlertMove) => {
      const path = { params: { path: { alert_id: id } } }
      return move.kind === 'acknowledge'
        ? unwrap(api.POST('/api/alerts/{alert_id}/acknowledge', path), 'Could not acknowledge.')
        : unwrap(
            api.POST('/api/alerts/{alert_id}/close', {
              ...path,
              body: { outcome: move.outcome, note: move.note || null },
            }),
            'Could not close the alert.',
          )
    },
    onSuccess: (alert) => queryClient.setQueryData(alertKeys.one(id), alert),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: alertKeys.one(id) }),
        queryClient.invalidateQueries({ queryKey: alertKeys.lists }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]),
  })
}

/** Closed alerts belong to History, open ones to Alerts (phase-05 decision 3). */
export const isClosed = (alert: Pick<Alert, 'status'>) =>
  alert.status !== 'active' && alert.status !== 'acknowledged'
