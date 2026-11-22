import { LinkButton } from '../../components/Button'
import { Feed, FeedCard, FeedChip } from '../../components/Feed'
import { Pill } from '../../components/Pill'

/** Latest frame from a running camera. Frames and FPS arrive in Phase 12. */
export function CameraPreviewCard() {
  return (
    <FeedCard
      live
      title="Camera preview"
      status={<Pill tone="gry">No camera running</Pill>}
      footer={
        <>
          <FeedChip color="var(--blu)">Tracked persons: —</FeedChip>
          <FeedChip color="var(--org)">Target bags: —</FeedChip>
          <FeedChip color="var(--color-live)" mono>
            YOLO26n + ByteTrack
          </FeedChip>
          <LinkButton to="/live" size="sm" className="ml-auto">
            Open live view
          </LinkButton>
        </>
      }
    >
      <Feed emptyText="No camera is running. Start a run on the Live Monitoring page." />
    </FeedCard>
  )
}
