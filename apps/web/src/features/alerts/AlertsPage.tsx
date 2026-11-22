import { PageHeader } from '../../components/PageHeader'
import { usePageTitle } from '../../lib/usePageTitle'
import { AlertsStats } from './AlertsStats'
import { AlertsTable } from './AlertsTable'

export default function AlertsPage() {
  usePageTitle('Alerts')
  return (
    <>
      <PageHeader title="Security Alerts" subtitle="All abandoned-bag and possible-theft alerts" />
      <AlertsStats />
      <AlertsTable />
    </>
  )
}
