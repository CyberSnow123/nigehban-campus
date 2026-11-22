import { useParams } from 'react-router-dom'

import { PageHeader, BackLink } from '../../components/PageHeader'
import { TYPE_PILL, type AlertType } from '../../lib/constants'
import { COL, TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { AlertDetailsCard } from './AlertDetailsCard'
import { CarrierCompareCard } from './CarrierCompareCard'
import { NarrativeCard } from './NarrativeCard'
import { SnapshotCard } from './SnapshotCard'

/**
 * Alert detail layout. `type` decides which sections and rows appear (the carrier comparison is
 * possible-theft only). It is unknown until the alert loads in Phase 7.
 */
export function AlertDetailView({ type }: { type?: AlertType }) {
  const title = type ? `Alert — ${TYPE_PILL[type].label}` : 'Alert'
  usePageTitle(title)
  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <PageHeader
        title={title}
        subtitle={<span className="font-mono text-[13px]">REF — · Triggered —</span>}
      />
      <div className={TWO_COL}>
        <div className={COL}>
          <SnapshotCard />
          {type === 'possible_theft' && <CarrierCompareCard />}
          <NarrativeCard />
        </div>
        <AlertDetailsCard type={type} />
      </div>
    </>
  )
}

export default function AlertDetailPage() {
  // The alert is fetched by `useParams().id` in Phase 7; its type then picks the layout.
  useParams<{ id: string }>()
  return <AlertDetailView />
}
