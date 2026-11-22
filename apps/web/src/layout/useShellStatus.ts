export interface ShellStatus {
  /** Alerts waiting for an operator. 0 hides the badges and the bell dot. */
  openAlerts: number
  /** A run is processing a camera. False hides the green dot on Live Monitoring. */
  hasLiveRun: boolean
}

/**
 * The one place the shell gets its live numbers from. Nothing feeds it yet, so the shell shows
 * no badges instead of invented ones (D-06).
 * TODO(phase-08): read `openAlerts` from the `['stats']` query. TODO(phase-12): `hasLiveRun`.
 */
export function useShellStatus(): ShellStatus {
  return { openAlerts: 0, hasLiveRun: false }
}
