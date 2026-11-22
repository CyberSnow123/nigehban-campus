import { Card, CardHeader } from '../../components/Card'
import { Table, type Column } from '../../components/Table'

const COLUMNS: Column[] = [
  { key: 'id', label: 'Alert', mono: true },
  { key: 'type', label: 'Type' },
  { key: 'role', label: 'Role' },
  { key: 'bag', label: 'Bag' },
  { key: 'when', label: 'When', mono: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action', align: 'right' },
]

/** Alerts where this track is the owner or the carrier. Rows arrive in Phase 8. */
export function PersonAlertsTable({ personLabel }: { personLabel: string }) {
  return (
    <Card>
      <CardHeader title={`Alerts involving ${personLabel}`} aside="0 found" />
      <Table
        caption={`Alerts involving ${personLabel}`}
        columns={COLUMNS}
        rows={[]}
        emptyText="No alerts involve this person. They are only being tracked."
      />
    </Card>
  )
}
