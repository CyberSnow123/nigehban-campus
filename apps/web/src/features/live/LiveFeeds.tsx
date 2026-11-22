import { CameraIcon } from '../../components/icons'
import { Feed, FeedCard, FeedChip } from '../../components/Feed'
import { Pill } from '../../components/Pill'

export type FeedLayout = 'single' | 'grid'

const NO_FEED = 'No camera is running. Runs and frames arrive in Phase 12.'

/** One large feed (1×1) or four small tiles (2×2). Frames and counts arrive in Phase 12. */
export function LiveFeeds({ layout }: { layout: FeedLayout }) {
  if (layout === 'grid') {
    return (
      <FeedCard title="All cameras" icon={<CameraIcon />} tag="Select a camera to open it">
        <div className="grid grid-cols-2 gap-2.5 bg-feed p-2.5">
          {[1, 2, 3, 4].map((slot) => (
            <div key={slot}>
              <Feed small emptyText="No camera" />
              <p className="m-0 px-0.5 pt-1.5 text-xs text-line-strong">Camera slot {slot}</p>
            </div>
          ))}
        </div>
      </FeedCard>
    )
  }
  return (
    <FeedCard
      live
      title="No camera selected"
      tag="—"
      status={<Pill tone="gry">Off</Pill>}
      footer={
        <>
          <FeedChip color="var(--blu)">Tracking — persons</FeedChip>
          <FeedChip color="var(--pur)">State: —</FeedChip>
          <span className="font-mono">Model: YOLO26n + ByteTrack</span>
        </>
      }
    >
      <Feed emptyText={NO_FEED} />
    </FeedCard>
  )
}
