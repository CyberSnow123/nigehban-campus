import { Link } from 'react-router-dom'

import { DemoBadge, Pill, StatusPill, TypePill } from '../../components/Pill'
import type { TableRow } from '../../components/Table'
import { NO_VALUE } from '../../lib/constants'
import type { Alert } from './api'
import { bagName, formatDateTime, formatShortDateTime, personPath } from './format'

export function PersonLink({ runId, trackId }: { runId: string; trackId?: number | null }) {
  if (trackId == null) return <span className="text-mute">{NO_VALUE}</span>
  return (
    <Link
      to={personPath(runId, trackId)}
      className="font-semibold whitespace-nowrap text-blu hover:underline"
    >
      Person #{trackId}
    </Link>
  )
}

export function CameraCell({ camera }: { camera: Alert['camera'] }) {
  return (
    <>
      <b className="font-semibold whitespace-nowrap">{camera.name}</b>
      <small className="block text-mute">{camera.location}</small>
    </>
  )
}

/** Date over time; the full date and time is the tooltip. */
export function ShortTime({ iso }: { iso: string }) {
  const [day, time] = formatShortDateTime(iso)
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="block leading-snug">
      {day}
      <span className="block text-mute">{time}</span>
    </time>
  )
}

/** One row of the Security Alerts table (phase-07 decision 15). */
export function alertRow(alert: Alert): TableRow {
  return {
    id: alert.id,
    cells: {
      id: (
        <span className="inline-flex flex-col items-start gap-1">
          {/* Also a link, so the alert opens even when the table is scrolled sideways. */}
          <Link to={`/alerts/${alert.id}`} className="hover:underline">
            {alert.ref_code}
          </Link>
          {alert.is_demo && <DemoBadge />}
        </span>
      ),
      type: <TypePill type={alert.type} />,
      bag: (
        <Pill tone="amb" small>
          {bagName(alert)}
        </Pill>
      ),
      owner: <PersonLink runId={alert.run_id} trackId={alert.owner_track_id} />,
      carrier: <PersonLink runId={alert.run_id} trackId={alert.carrier_track_id} />,
      camera: <CameraCell camera={alert.camera} />,
      time: <ShortTime iso={alert.occurred_at} />,
      status: <StatusPill status={alert.status} />,
      action: (
        <Link
          to={`/alerts/${alert.id}`}
          className="font-semibold whitespace-nowrap text-blu hover:underline"
          aria-label={`View alert ${alert.ref_code}`}
        >
          View →
        </Link>
      ),
    },
  }
}
