import { PageHeader } from '../../components/PageHeader'
import { COL, TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { ActiveAlertsList } from './ActiveAlertsList'
import { CameraPreviewCard } from './CameraPreviewCard'
import { CurrentTargetCard } from './CurrentTargetCard'
import { DashboardStats } from './DashboardStats'
import { TodayAlertsCard } from './TodayAlertsCard'

export default function DashboardPage() {
  usePageTitle('Dashboard')
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of campus cameras and unattended bags"
      />
      <DashboardStats />
      <div className={TWO_COL}>
        <CameraPreviewCard />
        <div className={COL}>
          <CurrentTargetCard />
          <ActiveAlertsList />
          <TodayAlertsCard />
        </div>
      </div>
    </>
  )
}
