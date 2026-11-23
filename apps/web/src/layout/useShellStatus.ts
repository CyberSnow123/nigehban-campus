import { useStats } from '../features/stats/api'

export interface ShellStatus {
  /** Alerts waiting for an operator. 0 hides the badges and the bell dot. */
  openAlerts: number
  /** A run is processing a camera. False hides the green dot on Live Monitoring. */
  hasLiveRun: boolean
}

/**
 * The shell's live numbers, from the shared `['stats']` poll. Until it loads (or if it fails)
 * both are off, so the shell shows no badge instead of an invented one (D-06).
 */
export function useShellStatus(): ShellStatus {
  const stats = useStats().data
  return {
    openAlerts: stats?.open_total ?? 0,
    hasLiveRun: (stats?.running_runs ?? 0) > 0,
  }
}
