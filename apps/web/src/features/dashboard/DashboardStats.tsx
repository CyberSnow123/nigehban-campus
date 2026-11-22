import { AlertIcon, BagIcon, CameraIcon, UserIcon } from '../../components/icons'
import { StatTile } from '../../components/StatTile'
import { GRID_4 } from '../../layout/grids'

/**
 * Four tiles from the prototype. No source yet, so each shows a dash.
 * Active cameras: Phase 12. Active alerts and its pills: Phase 8 (`/api/stats`).
 * People and Bags tracked have no contract yet (phase-05 gap 1).
 */
export function DashboardStats() {
  return (
    <div className={GRID_4}>
      <StatTile label="Active cameras" icon={<CameraIcon className="size-5" />} tone="grn" />
      <StatTile label="People tracked" icon={<UserIcon className="size-5" />} tone="blu" />
      <StatTile label="Bags tracked" icon={<BagIcon className="size-5" />} tone="amb" />
      <StatTile label="Active alerts" icon={<AlertIcon className="size-5" />} tone="red" />
    </div>
  )
}
