import { AlertIcon, ClockIcon, OkIcon } from '../../components/icons'
import { StatTile } from '../../components/StatTile'
import { GRID_4 } from '../../layout/grids'
import { useAlertCount } from './api'

/** Counts by status, from the list's `total` (phase-07 decision 7). A dash while loading. */
export function AlertsStats() {
  const total = useAlertCount()
  const active = useAlertCount({ status: 'active' })
  const acknowledged = useAlertCount({ status: 'acknowledged' })
  const resolved = useAlertCount({ status: 'resolved' })
  return (
    <div className={GRID_4}>
      <StatTile label="Total alerts" value={total} icon={<AlertIcon className="size-5" />} />
      <StatTile label="Active" value={active} icon={<AlertIcon className="size-5" />} tone="red" />
      <StatTile
        label="Acknowledged"
        value={acknowledged}
        icon={<ClockIcon className="size-5" />}
        tone="amb"
      />
      <StatTile label="Resolved" value={resolved} icon={<OkIcon className="size-5" />} tone="grn" />
    </div>
  )
}
