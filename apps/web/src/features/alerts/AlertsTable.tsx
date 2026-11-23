import { useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { SelectField } from '../../components/controls'
import { RefreshIcon } from '../../components/icons'
import { Pager } from '../../components/Pager'
import { Table, type Column } from '../../components/Table'
import { alertRow } from './alertRows'
import { useAlerts } from './api'
import { SearchNotePill } from './SearchNotePill'
import { TypeFilter } from './TypeFilter'
import { useAlertFilters, type StatusFilterValue } from './useAlertFilters'

const COLUMNS: Column[] = [
  { key: 'id', label: 'Alert ID', mono: true },
  { key: 'type', label: 'Type' },
  { key: 'bag', label: 'Bag' },
  { key: 'owner', label: 'Owner' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'camera', label: 'Camera' },
  { key: 'time', label: 'Time', mono: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action', align: 'right' },
]

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilterValue; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'closed', label: 'Resolved / closed' },
]

const PAGE_SIZE = 50

/** Filter bar plus the alerts table, newest first. */
export function AlertsTable() {
  const { type, status, q, page, update } = useAlertFilters()
  const queryClient = useQueryClient()
  const filtered = type !== 'all' || status !== 'all' || q !== ''
  const alerts = useAlerts({
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    q: q || undefined,
    page,
    page_size: PAGE_SIZE,
  })
  const data = alerts.data
  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-3.5">
        <TypeFilter value={type} onChange={(value) => update('type', value)} />
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchNotePill q={q} onClear={() => update('q', '')} />
          <SelectField
            label="Status"
            value={status}
            onChange={(event) => update('status', event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <Button
            aria-label="Refresh"
            title="Refresh"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
          >
            <RefreshIcon className="size-4" />
          </Button>
        </div>
      </div>
      <Table
        caption="Security alerts"
        columns={COLUMNS}
        rows={data?.items.map(alertRow) ?? []}
        loading={alerts.isPending}
        error={alerts.isError && !data ? alerts.error.message : undefined}
        emptyText={filtered ? 'No alerts match these filters.' : 'No alerts yet.'}
      />
      {data && pageCount > 1 && (
        <Pager
          page={page}
          pageCount={pageCount}
          shown={data.items.length}
          total={data.total}
          onPage={(next) => update('page', String(next))}
        />
      )}
    </Card>
  )
}
