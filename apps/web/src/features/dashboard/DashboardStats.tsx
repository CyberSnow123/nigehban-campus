import { AlertIcon, BagIcon, CameraIcon, UserIcon } from '../../components/icons'
import { Pill } from '../../components/Pill'
import { StatTile } from '../../components/StatTile'
import { GRID_4 } from '../../layout/grids'
import { useAlertCount } from '../alerts/api'
import { useStats } from '../stats/api'

/** "2 abandoned", "1 possible theft" or "All clear", under the Active alerts number. */
function ActiveAlertPills({ active }: { active: number }) {
  const abandoned = useAlertCount({ status: 'active', type: 'abandoned_bag' })
  const theft = useAlertCount({ status: 'active', type: 'possible_theft' })
  if (active === 0) return <Pill tone="grn">All clear</Pill>
  return (
    <>
      {!!abandoned && <Pill tone="red">{abandoned} abandoned</Pill>}
      {!!theft && <Pill tone="pur">{theft} possible theft</Pill>}
    </>
  )
}

/**
 * Four tiles from the prototype. Active alerts comes from `/api/stats`.
 * Active cameras needs the cameras API (Phase 12). People and Bags tracked need live run
 * telemetry (phase-05 gap 1, deferred to Phase 11/12), so they show a dash.
 */
export function DashboardStats() {
  const active = useStats().data?.active
  return (
    <div className={GRID_4}>
      <StatTile label="Active cameras" icon={<CameraIcon className="size-5" />} tone="grn" />
      <StatTile label="People tracked" icon={<UserIcon className="size-5" />} tone="blu" />
      <StatTile label="Bags tracked" icon={<BagIcon className="size-5" />} tone="amb" />
      <StatTile
        label="Active alerts"
        value={active}
        icon={<AlertIcon className="size-5" />}
        tone="red"
      >
        {active !== undefined && <ActiveAlertPills active={active} />}
      </StatTile>
    </div>
  )
}
