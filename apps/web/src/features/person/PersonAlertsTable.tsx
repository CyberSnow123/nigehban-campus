import { Link } from 'react-router-dom'

import { Card, CardHeader } from '../../components/Card'
import { Pill, StatusPill, TypePill } from '../../components/Pill'
import { Table, type Column, type TableRow } from '../../components/Table'
import { ShortTime } from '../alerts/alertRows'
import type { Alert } from '../alerts/api'
import { bagName } from '../alerts/format'
import { ROLE_PILL, roleIn } from './personFacts'

const COLUMNS: Column[] = [
  { key: 'id', label: 'Alert', mono: true },
  { key: 'type', label: 'Type' },
  { key: 'role', label: 'Role' },
  { key: 'bag', label: 'Bag' },
  { key: 'when', label: 'When', mono: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action', align: 'right' },
]

function personAlertRow(alert: Alert, trackId: number): TableRow {
  const role = roleIn(alert, trackId)
  return {
    id: alert.id,
    cells: {
      id: (
        <Link
          to={`/alerts/${alert.id}`}
          className="font-semibold whitespace-nowrap hover:underline"
        >
          {alert.ref_code}
        </Link>
      ),
      type: <TypePill type={alert.type} />,
      role: role && <Pill tone={ROLE_PILL[role].tone}>{ROLE_PILL[role].label}</Pill>,
      bag: <span className="whitespace-nowrap">{bagName(alert)}</span>,
      when: <ShortTime iso={alert.occurred_at} />,
      status: <StatusPill status={alert.status} />,
      action: (
        <Link
          to={`/alerts/${alert.id}`}
          className="font-semibold whitespace-nowrap text-blu hover:underline"
          aria-label={`View alert ${alert.ref_code}`}
        >
          View
        </Link>
      ),
    },
  }
}

interface PersonAlertsTableProps {
  personLabel: string
  trackId: number
  alerts?: Alert[]
  total?: number
  loading?: boolean
  error?: string
}

/** Alerts where this track is the owner or the carrier, newest first. */
export function PersonAlertsTable({
  personLabel,
  trackId,
  alerts = [],
  total,
  loading,
  error,
}: PersonAlertsTableProps) {
  return (
    <Card>
      <CardHeader
        title={`Alerts involving ${personLabel}`}
        aside={total === undefined ? '— found' : `${total} found`}
      />
      <Table
        caption={`Alerts involving ${personLabel}`}
        columns={COLUMNS}
        rows={alerts.map((alert) => personAlertRow(alert, trackId))}
        loading={loading}
        error={error}
        emptyText="No alerts involve this person. They are only being tracked."
      />
    </Card>
  )
}
