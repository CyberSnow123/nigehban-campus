import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { usePageTitle } from '../../lib/usePageTitle'
import { HistoryBar } from './HistoryBar'
import { HistoryStats } from './HistoryStats'
import { HistoryTable } from './HistoryTable'
import { useHistoryFilters } from './useHistoryFilters'

/** Past (closed) alerts and how they ended. */
export default function HistoryPage() {
  usePageTitle('History')
  const filters = useHistoryFilters()
  return (
    <>
      <PageHeader title="History" subtitle="Past alerts and how they were resolved" />
      <HistoryStats days={filters.days} type={filters.type === 'all' ? undefined : filters.type} />
      <Card>
        <HistoryBar filters={filters} />
        <HistoryTable filters={filters} />
      </Card>
    </>
  )
}
