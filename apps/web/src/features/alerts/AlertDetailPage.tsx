import { useParams } from 'react-router-dom'

import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { BackLink, PageHeader } from '../../components/PageHeader'
import { DemoBadge, StatusPill } from '../../components/Pill'
import { TYPE_PILL } from '../../lib/constants'
import { COL, TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { AlertDetailsCard } from './AlertDetailsCard'
import { AlertTimeline } from './AlertTimeline'
import { ApiFailure, isClosed, useAlert, type Alert } from './api'
import { CarrierCompareCard } from './CarrierCompareCard'
import { formatDateTime } from './format'
import { narrative } from './narrative'
import { NarrativeCard } from './NarrativeCard'
import { SnapshotCard } from './SnapshotCard'

/**
 * Alert detail layout. The alert's type decides which sections and rows appear (the carrier
 * comparison is possible-theft only). Before it loads, only the fields every alert has show.
 */
export function AlertDetailView({ alert }: { alert?: Alert }) {
  const title = alert ? `Alert ${alert.ref_code} — ${TYPE_PILL[alert.type].label}` : 'Alert'
  usePageTitle(alert ? `Alert ${alert.ref_code}` : 'Alert')
  const closed = alert !== undefined && isClosed(alert)
  return (
    <>
      <BackLink to={closed ? '/history' : '/alerts'}>
        {closed ? 'Back to History' : 'Back to Alerts'}
      </BackLink>
      <PageHeader
        title={title}
        badge={
          alert && (
            <span className="inline-flex flex-wrap gap-2">
              <StatusPill status={alert.status} />
              {alert.is_demo && <DemoBadge />}
            </span>
          )
        }
        subtitle={
          <span className="font-mono text-[13px]">
            REF {alert?.ref_code ?? '—'} · Triggered {formatDateTime(alert?.occurred_at) ?? '—'}
          </span>
        }
      />
      <div className={TWO_COL}>
        <div className={COL}>
          <SnapshotCard alert={alert} />
          {alert?.type === 'possible_theft' && <CarrierCompareCard alert={alert} />}
          <NarrativeCard text={alert && narrative(alert)} />
        </div>
        <div className={COL}>
          <AlertDetailsCard alert={alert} />
          {alert && <AlertTimeline alert={alert} />}
        </div>
      </div>
    </>
  )
}

function AlertLoadError({ error }: { error: Error }) {
  const missing = error instanceof ApiFailure && error.status === 404
  const title = missing ? 'Alert not found' : 'Could not load this alert'
  usePageTitle(title)
  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <Card>
        <EmptyState title={title}>
          {missing ? 'No alert has this ID. It may have been mistyped.' : error.message}
        </EmptyState>
      </Card>
    </>
  )
}

export default function AlertDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const query = useAlert(id)
  // A failed poll keeps the alert on screen; only a failed first load shows the error.
  if (query.isError && !query.data) return <AlertLoadError error={query.error} />
  return <AlertDetailView alert={query.data} />
}
