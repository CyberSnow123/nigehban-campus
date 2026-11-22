import { AlertIcon, ClockIcon, OkIcon } from '../../components/icons'
import { StatTile } from '../../components/StatTile'
import { GRID_4 } from '../../layout/grids'

/** Counts by status. They come from the alerts API in Phase 7, so they are dashes for now. */
export function AlertsStats() {
  return (
    <div className={GRID_4}>
      <StatTile label="Total alerts" icon={<AlertIcon className="size-5" />} />
      <StatTile label="Active" icon={<AlertIcon className="size-5" />} tone="red" />
      <StatTile label="Acknowledged" icon={<ClockIcon className="size-5" />} tone="amb" />
      <StatTile label="Resolved" icon={<OkIcon className="size-5" />} tone="grn" />
    </div>
  )
}
