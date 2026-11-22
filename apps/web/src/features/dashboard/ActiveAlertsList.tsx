import type { ReactNode } from 'react'

import { LinkButton } from '../../components/Button'
import { Card, CardBody } from '../../components/Card'
import { TypePill } from '../../components/Pill'
import type { AlertType } from '../../lib/constants'
import { cx } from '../../lib/cx'

export interface ActiveAlertSummary {
  id: string
  type: AlertType
  time: string
  title: string
  text: ReactNode
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

/** Active alerts, newest first. The list itself arrives in Phase 8. */
export function ActiveAlertsList({ alerts = [] }: { alerts?: ActiveAlertSummary[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardBody className="text-mute">No active alerts. Everything is with its owner.</CardBody>
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {alerts.map((alert) => (
        <ActiveAlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
