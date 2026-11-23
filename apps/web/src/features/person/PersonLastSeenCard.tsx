import { LinkButton } from '../../components/Button'
import { Feed, FeedCard, Snapshot } from '../../components/Feed'
import { NO_VALUE } from '../../lib/constants'
import { useAlertSnapshot, type Alert } from '../alerts/api'
import { formatShortDateTime } from '../alerts/format'

/**
 * Where this person was last seen: the snapshot of their newest alert. Only alert times are
 * known (no run telemetry yet), so the footer says "Last alert", not "last sighting".
 */
export function PersonLastSeenCard({ alert }: { alert?: Alert }) {
  const image = useAlertSnapshot(alert?.id ?? '', Boolean(alert))
  const title = alert ? `Last seen on ${alert.camera.name} — ${alert.camera.location}` : 'Last seen'
  const when = alert && formatShortDateTime(alert.occurred_at)
  return (
    <FeedCard
      live
      title={title}
      tag={when ? `${when[0]} ${when[1]}` : NO_VALUE}
      footer={
        <>
          <span>{when ? `Last alert ${when[1]}` : NO_VALUE}</span>
          <LinkButton to="/live" variant="dark" size="sm" className="ml-auto">
            Track in Live Monitoring
          </LinkButton>
        </>
      }
    >
      {alert ? (
        <Snapshot
          src={image.src}
          state={image.state === 'ready' ? undefined : image.state}
          alt={`Frame from ${alert.camera.name} when alert ${alert.ref_code} was raised`}
        />
      ) : (
        <Feed emptyText="No sighting yet" />
      )}
    </FeedCard>
  )
}
