import type { ReactNode } from 'react'

import { LinkButton } from '../../components/Button'
import { Card, CardBody } from '../../components/Card'
import { TypePill } from '../../components/Pill'
import type { AlertType } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { useAlerts, type Alert } from '../alerts/api'
import { bagName, formatShortDateTime } from '../alerts/format'
import { narrative } from '../alerts/narrative'

export interface ActiveAlertSummary {
  id: string
  type: AlertType
  time: string
  title: string
  text: ReactNode
}

/** How many active alerts the Dashboard shows, newest first. */
const SHOWN = 5

export function toSummary(alert: Alert): ActiveAlertSummary {
  return {
    id: alert.id,
    type: alert.type,
    time: formatShortDateTime(alert.occurred_at)[1],
    title: `${bagName(alert)} · ${alert.camera.name}`,
    text: narrative(alert),
  }
}

/** Red or purple card for one active alert (prototype `.alertcard`). */
export function ActiveAlertCard({ alert }: { alert: ActiveAlertSummary }) {
  const theft = alert.type === 'possible_theft'
  return (
    <div
      className={cx(
        'rounded-xl border p-5',
        theft ? 'border-pur-line bg-pur-bg' : 'border-red-line bg-red-bg',
      )}
    >
      <div className="flex items-center gap-2">
        <TypePill type={alert.type} />
        <span className="font-mono text-[13px] text-mute">{alert.time}</span>
      </div>
      <b className="mt-2 block">{alert.title}</b>
      <p className="mt-1.5 mb-3.5 text-sm">{alert.text}</p>
      <LinkButton to={`/alerts/${alert.id}`} variant={theft ? 'pur' : 'red'} wide>
        View alert →
      </LinkButton>
    </div>
  )
}

function NoticeCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardBody className="text-mute">{children}</CardBody>
    </Card>
  )
}

/** The newest active alerts, refreshed every 3 s. */
export function ActiveAlertsList() {
  const query = useAlerts({ status: 'active', page_size: SHOWN })
  const alerts = query.data?.items
  if (!alerts) {
    return <NoticeCard>{query.isError ? query.error.message : 'Loading active alerts…'}</NoticeCard>
  }
  if (alerts.length === 0) {
    return <NoticeCard>No active alerts. Everything is with its owner.</NoticeCard>
  }
  return (
    <div className="flex flex-col gap-4">
      {alerts.map((alert) => (
        <ActiveAlertCard key={alert.id} alert={toSummary(alert)} />
      ))}
    </div>
  )
}
