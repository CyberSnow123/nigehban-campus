import { CameraIcon } from '../../components/icons'
import { FeedCard, Snapshot } from '../../components/Feed'
import { useAlertSnapshot, type Alert } from './api'
import { formatDateTime, percent } from './format'

/** The frame the alert was raised on, fetched with the login token (phase-07 decision 8). */
export function SnapshotCard({ alert }: { alert?: Alert }) {
  const image = useAlertSnapshot(alert?.id ?? '', Boolean(alert))
  const title = alert
    ? `${alert.camera.name} — ${alert.camera.location} snapshot (${formatDateTime(alert.occurred_at)})`
    : 'Snapshot'
  return (
    <FeedCard
      icon={<CameraIcon />}
      title={title}
      tag={alert ? `t = ${alert.video_ts_s.toFixed(1)} s` : '—'}
      footer={
        <>
          <span>
            Detection zone: <b className="text-ink">{alert?.camera.location ?? '—'}</b>
          </span>
          <span className="ml-auto font-mono">
            AI confidence {percent(alert?.confidence) ?? '—'}
          </span>
        </>
      }
    >
      <Snapshot
        src={image.src}
        state={image.state === 'ready' ? undefined : image.state}
        alt="Frame from the camera when the alert was raised"
      />
    </FeedCard>
  )
}
