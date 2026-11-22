import { useSearchParams } from 'react-router-dom'

import { Card } from '../../components/Card'
import { SelectField } from '../../components/controls'
import { ClockIcon, OkIcon } from '../../components/icons'
import { PageHeader } from '../../components/PageHeader'
import { Pager } from '../../components/Pager'
import { StatTile } from '../../components/StatTile'
import { Table, type Column } from '../../components/Table'
import { GRID_3 } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { TypeFilter } from '../alerts/TypeFilter'
import { useAlertFilters } from '../alerts/useAlertFilters'

const COLUMNS: Column[] = [
  { key: 'date', label: 'Date & time', mono: true },
  { key: 'id', label: 'Alert ID', mono: true },
  { key: 'type', label: 'Type' },
  { key: 'bag', label: 'Bag' },
  { key: 'camera', label: 'Camera' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'action', label: 'Action', align: 'right' },
]

const RANGES = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
] as const

/** Past alerts and how they ended. Rows and counts arrive in Phase 8. */
export default function HistoryPage() {
  usePageTitle('History')
  const { type, update } = useAlertFilters()
  const [params, setParams] = useSearchParams()
  const range = RANGES.find((r) => r.value === params.get('range'))?.value ?? '7'

  function setRange(value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === '7') next.delete('range')
        else next.set('range', value)
        return next
      },
      { replace: true },
    )
  }

  return (
    <>
      <PageHeader title="History" subtitle="Past alerts and how they were resolved" />
      <div className={GRID_3}>
        <StatTile label="Alerts this week" icon={<ClockIcon className="size-5" />} />
        {/* No source for response time yet (phase-05 gap 5). */}
        <StatTile label="Average response" icon={<ClockIcon className="size-5" />} tone="amb" />
        <StatTile label="False alarms" icon={<OkIcon className="size-5" />} tone="grn" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-3.5">
          <TypeFilter value={type} onChange={(value) => update('type', value)} />
          <SelectField
            label="Date range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectField>
        </div>
        <Table
          caption="Past alerts"
          columns={COLUMNS}
          rows={[]}
          emptyText="No records for this filter."
        />
        <Pager page={1} pageCount={1} shown={0} total={0} onPage={() => undefined} />
      </Card>
    </>
  )
}
