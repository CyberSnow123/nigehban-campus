import type { ReactNode } from 'react'

import { Card, CardBody, CardHeader } from '../../components/Card'
import { KeyValue } from '../../components/KeyValue'
import { StatusPill, TypePill } from '../../components/Pill'
import type { AlertType } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { AlertActions } from './AlertActions'
import { CameraCell, PersonLink } from './alertRows'
import type { Alert } from './api'
import { bagName, formatDateTime, metres, seconds } from './format'

interface Row {
  label: string
  value?: ReactNode
  hot?: boolean
}

function camera(alert: Alert): ReactNode {
  return <CameraCell camera={alert.camera} />
}

/** The details rows for each type, in the prototype's order. */
function rowsFor(alert: Alert): Row[] {
  const owner = <PersonLink runId={alert.run_id} trackId={alert.owner_track_id} />
  const common = {
    bag: bagName(alert),
    time: formatDateTime(alert.occurred_at),
    status: <StatusPill status={alert.status} />,
  }
  if (alert.type === 'abandoned_bag') {
    return [
      { label: 'Type', value: <TypePill type={alert.type} /> },
      { label: 'Bag', value: common.bag },
      { label: 'Owner', value: owner },
      { label: 'Camera', value: camera(alert) },
      { label: 'Time', value: common.time },
      { label: 'Distance', value: metres(alert.owner_distance_m) },
      // The alert only fires once separation passes the threshold, so it is always "hot".
      { label: 'Separation', value: seconds(alert.separation_s), hot: true },
      { label: 'Threshold' }, // from config.json, shown from Phase 12 (decision 12)
      { label: 'Status', value: common.status },
    ]
  }
  return [
    { label: 'Alert type', value: <TypePill type={alert.type} /> },
    { label: 'Bag', value: common.bag },
    { label: 'Registered owner', value: owner },
    {
      label: 'Active carrier',
      value: <PersonLink runId={alert.run_id} trackId={alert.carrier_track_id} />,
    },
    { label: 'Owner distance', value: metres(alert.owner_distance_m) },
    { label: 'Owner away', value: seconds(alert.owner_away_s) },
    { label: 'Bag movement' }, // not in the event contract
    { label: 'Camera', value: camera(alert) },
    { label: 'Time', value: common.time },
    { label: 'Status', value: common.status },
  ]
}

// Until the alert loads we only know the fields every alert has.
const LOADING_ROWS: Row[] = ['Type', 'Bag', 'Camera', 'Time', 'Status'].map((label) => ({ label }))

const CHECK_CODE: Record<AlertType, string> = {
  abandoned_bag: 'ABANDON_CHECK',
  possible_theft: 'THEFT_CHECK',
}

export function AlertDetailsCard({ alert }: { alert?: Alert }) {
  const rows = alert ? rowsFor(alert) : LOADING_ROWS
  return (
    <Card>
      <CardHeader
        title="Alert details"
        aside={
          <span
            className={cx('font-mono', alert?.type === 'possible_theft' ? 'text-pur' : 'text-red')}
          >
            {alert ? CHECK_CODE[alert.type] : '—'}
          </span>
        }
      />
      <CardBody>
        {rows.map((row) => (
          <KeyValue key={row.label} label={row.label} hot={row.hot}>
            {row.value}
          </KeyValue>
        ))}
        {alert && <AlertActions alert={alert} />}
      </CardBody>
    </Card>
  )
}
