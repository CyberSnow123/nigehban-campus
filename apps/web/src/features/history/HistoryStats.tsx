import { ClockIcon, OkIcon } from '../../components/icons'
import { StatTile } from '../../components/StatTile'
import { GRID_3 } from '../../layout/grids'
import type { AlertType } from '../../lib/constants'
import { duration } from '../alerts/format'
import { useHistoryStats, type HistoryDays } from '../stats/api'

/** The first tile's label follows the range (phase-08 decision 1). */
export const RANGE_TILE_LABEL: Record<HistoryDays, string> = {
  1: 'Alerts in last 24 hours',
  7: 'Alerts this week',
  30: 'Alerts in last 30 days',
}

/** Closed alerts in the selected range and type: count, mean response time, false alarms. */
export function HistoryStats({ days, type }: { days: HistoryDays; type?: AlertType }) {
  const stats = useHistoryStats(days, type).data
  return (
    <div className={GRID_3}>
      <StatTile
        label={RANGE_TILE_LABEL[days]}
        value={stats?.total}
        icon={<ClockIcon className="size-5" />}
      />
      <StatTile
        label="Average response"
        value={duration(stats?.avg_response_s)}
        icon={<ClockIcon className="size-5" />}
        tone="amb"
      />
      <StatTile
        label="False alarms"
        value={stats?.false_alarms}
        icon={<OkIcon className="size-5" />}
        tone="grn"
      />
    </div>
  )
}
