import { CameraIcon } from '../../components/icons'
import { FeedCard, Snapshot } from '../../components/Feed'

/** The frame the alert was raised on. The image itself loads in Phase 7. */
export function SnapshotCard({ src }: { src?: string }) {
  return (
    <FeedCard
      icon={<CameraIcon />}
      title="Snapshot"
      tag="—"
      footer={
        <>
          <span>
            Detection zone: <b className="text-ink">—</b>
          </span>
          <span className="ml-auto font-mono">AI confidence —</span>
        </>
      }
    >
      <Snapshot src={src} alt="Frame from the camera when the alert was raised" />
    </FeedCard>
  )
}
