import { SLOW_POLL_MS } from '../../lib/api/query'
import { ApiFailure, useAlerts } from '../alerts/api'

/** Enough for one person in one run; the API's page maximum. */
const LIMIT = 100

/**
 * Every alert where this track is the owner or the carrier, in one run, newest first.
 * `unknown` is true when there are none, or the run ID is malformed (422): without run telemetry
 * an untracked ID can't be told apart from one with no alerts.
 */
export function usePersonAlerts(runId: string, trackId: number) {
  const query = useAlerts(
    { run_id: runId, person: trackId, page_size: LIMIT },
    { interval: SLOW_POLL_MS },
  )
  const alerts = query.data?.items
  const badRun = query.error instanceof ApiFailure && query.error.status === 422
  return {
    alerts,
    total: query.data?.total,
    loading: query.isPending,
    error: query.isError && !alerts && !badRun ? query.error.message : undefined,
    unknown: badRun || (alerts !== undefined && alerts.length === 0),
  }
}
