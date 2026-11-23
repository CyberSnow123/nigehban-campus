import { useParams } from 'react-router-dom'

import { Card, CardBody } from '../../components/Card'
import { BackLink, PageHeader } from '../../components/PageHeader'
import { Pill } from '../../components/Pill'
import { COL, TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { linkedBags, personRole } from './personFacts'
import { PersonAlertsTable } from './PersonAlertsTable'
import { PersonLastSeenCard } from './PersonLastSeenCard'
import { PersonProfileCard } from './PersonProfileCard'
import { usePersonAlerts } from './usePersonAlerts'

/** Track IDs are positive whole numbers. Anything else in the address is not a person. */
export function parseTrackId(raw: string | undefined): number | null {
  return raw && /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
}

function PersonNotFound({ title, text }: { title: string; text: string }) {
  usePageTitle(title)
  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <Card className="max-w-[560px]">
        <CardBody>
          <h1 className="m-0 text-[clamp(26px,3vw,32px)] font-semibold">{title}</h1>
          <p className="mt-1.5 mb-0 text-mute">{text}</p>
        </CardBody>
      </Card>
    </>
  )
}

/** One tracked person in one run (track IDs are per run, Frontend.md §3), from their alerts. */
function PersonView({ runId, trackId }: { runId: string; trackId: number }) {
  const label = `Person #${trackId}`
  usePageTitle(label)
  const { alerts, total, loading, error, unknown } = usePersonAlerts(runId, trackId)
  if (unknown) {
    return (
      <PersonNotFound
        title={label}
        text="No alert in this run involves this person. People appear here once an alert names them as an owner or a carrier."
      />
    )
  }
  const role = alerts && personRole(alerts, trackId)
  const latest = alerts?.[0]
  return (
    <>
      <BackLink to="/alerts">Back to Alerts</BackLink>
      <PageHeader
        title={label}
        badge={
          role ? (
            <Pill tone={role.tone}>{role.label}</Pill>
          ) : (
            <Pill tone="gry">{loading ? 'Loading…' : 'Role not known yet'}</Pill>
          )
        }
        subtitle={
          <>
            Track ID <span className="font-mono">P-{String(trackId).padStart(2, '0')}</span>
          </>
        }
      />
      <div className={TWO_COL}>
        <div className={COL}>
          <PersonLastSeenCard alert={latest} />
        </div>
        <PersonProfileCard latest={latest} bags={alerts && linkedBags(alerts, trackId)} />
      </div>
      <div className="mt-5">
        <PersonAlertsTable
          personLabel={label}
          trackId={trackId}
          alerts={alerts}
          total={total}
          loading={loading}
          error={error}
        />
      </div>
    </>
  )
}

export default function PersonPage() {
  const { runId = '', trackId } = useParams<{ runId: string; trackId: string }>()
  const id = parseTrackId(trackId)
  if (id === null) {
    return (
      <PersonNotFound
        title="Unknown person"
        text="This address does not point to a tracked person. Open a person from an alert instead."
      />
    )
  }
  return <PersonView runId={runId} trackId={id} />
}
