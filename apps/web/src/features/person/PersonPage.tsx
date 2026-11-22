import { useParams } from 'react-router-dom'

import { Card, CardBody } from '../../components/Card'
import { BackLink, PageHeader } from '../../components/PageHeader'
import { Pill } from '../../components/Pill'
import { COL, TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { PersonAlertsTable } from './PersonAlertsTable'
import { PersonLastSeenCard } from './PersonLastSeenCard'
import { PersonProfileCard } from './PersonProfileCard'

/** Track IDs are positive whole numbers. Anything else in the address is not a person. */
export function parseTrackId(raw: string | undefined): number | null {
  return raw && /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
}

function PersonNotFound() {
  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <Card className="max-w-[560px]">
        <CardBody>
          <h1 className="m-0 text-[clamp(26px,3vw,32px)] font-semibold">Unknown person</h1>
          <p className="mt-1.5 mb-0 text-mute">
            This address does not point to a tracked person. Open a person from an alert instead.
          </p>
        </CardBody>
      </Card>
    </>
  )
}

/**
 * Track IDs are per run (Frontend.md §3). The person's role, last sighting and alerts come from
 * the alerts API in Phase 8.
 */
export default function PersonPage() {
  const { trackId } = useParams<{ runId: string; trackId: string }>()
  const id = parseTrackId(trackId)
  usePageTitle(id ? `Person #${id}` : 'Unknown person')
  if (id === null) return <PersonNotFound />

  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <PageHeader
        title={`Person #${id}`}
        badge={<Pill tone="gry">Role not known yet</Pill>}
        subtitle={
          <>
            Track ID <span className="font-mono">P-{String(id).padStart(2, '0')}</span>
          </>
        }
      />
      <div className={TWO_COL}>
        <div className={COL}>
          <PersonLastSeenCard />
        </div>
        <PersonProfileCard />
      </div>
      <div className="mt-5">
        <PersonAlertsTable personLabel={`Person #${id}`} />
      </div>
    </>
  )
}
