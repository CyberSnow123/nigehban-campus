import { Link } from 'react-router-dom'

import { Pager } from '../../components/Pager'
import { DemoBadge, Pill, StatusPill, TypePill } from '../../components/Pill'
import { Table, type Column, type TableRow } from '../../components/Table'
import { CameraCell, ShortTime } from '../alerts/alertRows'
import type { Alert } from '../alerts/api'
import { bagName } from '../alerts/format'
import { HISTORY_PAGE_SIZE, useHistoryAlerts } from './api'
import type { HistoryFilters } from './useHistoryFilters'

const COLUMNS: Column[] = [
  { key: 'date', label: 'Date & time', mono: true },
  { key: 'id', label: 'Alert ID', mono: true },
  { key: 'type', label: 'Type' },
  { key: 'bag', label: 'Bag' },
  { key: 'camera', label: 'Camera' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'action', label: 'Action', align: 'right' },
]

export function historyRow(alert: Alert): TableRow {
  return {
    id: alert.id,
    cells: {
      date: <ShortTime iso={alert.occurred_at} />,
      id: (
        <span className="inline-flex flex-col items-start gap-1">
          <Link to={`/alerts/${alert.id}`} className="hover:underline">
            {alert.ref_code}
          </Link>
          {alert.is_demo && <DemoBadge />}
        </span>
      ),
      type: <TypePill type={alert.type} />,
      bag: (
        <Pill tone="amb" small>
          {bagName(alert)}
        </Pill>
      ),
      camera: <CameraCell camera={alert.camera} />,
      outcome: <StatusPill status={alert.status} />,
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

/** Closed alerts for the filters, newest first, 20 a page. */
export function HistoryTable({ filters }: { filters: HistoryFilters }) {
  const { type, outcome, days, q, page, update } = filters
  const query = useHistoryAlerts({ type, outcome, days, q, page })
  const data = query.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE)) : 1
  return (
    <>
      <Table
        caption="Past alerts"
        columns={COLUMNS}
        rows={data?.items.map(historyRow) ?? []}
        loading={query.isPending}
        error={query.isError && !data ? query.error.message : undefined}
        emptyText="No records for this filter."
      />
      <Pager
        page={page}
        pageCount={pageCount}
        shown={data?.items.length ?? 0}
        total={data?.total ?? 0}
        onPage={(next) => update('page', String(next))}
      />
    </>
  )
}
