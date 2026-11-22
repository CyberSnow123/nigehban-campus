import { useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { SelectField } from '../../components/controls'
import { RefreshIcon } from '../../components/icons'
import { Pill } from '../../components/Pill'
import { Table, type Column } from '../../components/Table'
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

/** Filter bar plus the alerts table. Rows arrive in Phase 7. */
export function AlertsTable() {
  const { type, status, q, update } = useAlertFilters()
  const queryClient = useQueryClient()
  const filtered = type !== 'all' || status !== 'all' || q !== ''

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-3.5">
        <TypeFilter value={type} onChange={(value) => update('type', value)} />
        <div className="flex flex-wrap items-center gap-2.5">
          {q && (
            <Pill tone="blu">
              Search: {q}
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => update('q', '')}
                className="font-bold"
              >
                ×
              </button>
            </Pill>
          )}
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
        rows={[]}
        emptyText={filtered ? 'No alerts match these filters.' : 'No alerts yet.'}
      />
    </Card>
  )
}
