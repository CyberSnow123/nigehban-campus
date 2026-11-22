import { Button } from '../../components/Button'
import { PageHeader } from '../../components/PageHeader'
import { SETTINGS_GRID } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { useLogoutNavigate } from '../auth/useLogoutNavigate'
import { CamerasCard } from './CamerasCard'
import { DetectionRulesCard } from './DetectionRulesCard'
import { TheftCheckCard } from './TheftCheckCard'

/**
 * Detection rules, theft check, cameras and notifications. Every control is disabled until the
 * settings API exists (Phase 12), which also makes the page read-only for operators.
 */
export default function SettingsPage() {
  usePageTitle('Settings')
  const logout = useLogoutNavigate()
  const NOT_YET = 'Settings can be changed from Phase 12'

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Detection rules, theft check, cameras and notifications"
      />
      <div className={SETTINGS_GRID}>
        <DetectionRulesCard />
        <TheftCheckCard />
        <CamerasCard />
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button variant="dark" disabled title={NOT_YET}>
          Save changes
        </Button>
        <Button disabled title={NOT_YET}>
          Reset to defaults
        </Button>
        <Button className="ml-auto text-red" onClick={logout}>
          Log out
        </Button>
      </div>
    </>
  )
}
