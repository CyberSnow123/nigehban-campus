/** Alert data for the Alerts and Alert detail pages. All calls go through `lib/api/client`. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, errorMessage, NETWORK_ERROR } from '../../lib/api/client'
import type { paths } from '../../lib/api/schema'
import type { AlertStatus } from '../../lib/constants'
import { useAuthedImage } from '../../lib/useAuthedImage'

export type AlertListParams = NonNullable<paths['/api/alerts']['get']['parameters']['query']>
export type CloseOutcome = Exclude<AlertStatus, 'active' | 'acknowledged'>

export const alertKeys = {
  lists: ['alerts'] as const,
  list: (params: AlertListParams) => ['alerts', params] as const,
  one: (id: string) => ['alert', id] as const,
  actions: (id: string) => ['alert', id, 'actions'] as const,
  snapshot: (id: string) => ['alert', id, 'snapshot'] as const,
}

/** A failed API call, with the server's message and HTTP status. */
export class ApiFailure extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface Result<T> {
  data?: T
  error?: unknown
  response: Response
}

async function unwrap<T>(call: Promise<Result<T>>, fallback: string): Promise<T> {
  let result: Result<T>
  try {
    result = await call
  } catch {
    throw new ApiFailure(NETWORK_ERROR, 0)
  }
  if (result.error !== undefined || result.data === undefined) {
    throw new ApiFailure(errorMessage(result.error, fallback), result.response.status)
  }
  return result.data
}

/** A client error (4xx) will not change on retry; a server or network error is retried once. */
function retryOnce(count: number, error: Error): boolean {
  const status = error instanceof ApiFailure ? error.status : 0
  return !(status >= 400 && status < 500) && count < 1
}

// Fetchers. The read types come from them, because openapi-fetch's response types differ
// slightly from `components['schemas']` (a fixed-length `bbox` becomes `number[]`).
const fetchAlerts = (params: AlertListParams) =>
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

export function useAlerts(params: AlertListParams) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => fetchAlerts(params),
    placeholderData: keepPreviousData, // keep the old rows while a new filter loads
    retry: retryOnce,
  })
}

/** How many alerts match, read from the list's `total` (one row is fetched). */
export function useAlertCount(status?: AlertListParams['status']) {
  return useAlerts({ status, page_size: 1 }).data?.total
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: alertKeys.one(id),
    queryFn: () => fetchAlert(id),
    retry: retryOnce,
  })
}

export function useAlertActions(id: string, enabled = true) {
  return useQuery({
    queryKey: alertKeys.actions(id),
    queryFn: () => fetchActions(id),
    enabled,
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

/** Acknowledge or close. On success the alert, its timeline and every list are reloaded. */
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
      ]),
  })
}
