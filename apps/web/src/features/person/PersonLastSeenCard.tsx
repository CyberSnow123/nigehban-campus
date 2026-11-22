import { LinkButton } from '../../components/Button'
import { Feed, FeedCard } from '../../components/Feed'

/** Where this person was last seen. The frame and place come from their latest alert (Phase 8). */
export function PersonLastSeenCard() {
  return (
    <FeedCard
      live
      title="Last seen"
      tag="—"
      footer={
        <>
          <span>—</span>
          <LinkButton to="/live" variant="dark" size="sm" className="ml-auto">
            Track in Live Monitoring
          </LinkButton>
        </>
      }
    >
      <Feed emptyText="No sighting yet" />
    </FeedCard>
  )
}
