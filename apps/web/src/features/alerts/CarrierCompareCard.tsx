import { Card, CardBody, CardHeader } from '../../components/Card'
import { ProgressBar } from '../../components/charts'
import { Pill } from '../../components/Pill'
import { NO_VALUE } from '../../lib/constants'
import type { Alert } from './api'
import { percent } from './format'

function PersonPanel({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-sm">{title}</b>
        <Pill tone="gry" small>
          {badge}
        </Pill>
      </div>
      <div className="mt-2 grid aspect-[4/3] max-h-60 place-items-center rounded-lg bg-feed px-3 text-center text-xs text-mute">
        Appearance images arrive with the owner fingerprint (FYP-2)
      </div>
    </div>
  )
}

/**
 * "Is the carrier the owner?" for a possible-theft alert. The score is the alert's
 * `owner_match`. A possible-theft alert is only raised when that score is below the
 * configured threshold, so the pill can say so without knowing the threshold itself; the
 * threshold value reaches the UI in Phase 12. Appearance images arrive in Phase 17 (gap 3).
 */
export function CarrierCompareCard({ alert }: { alert: Alert }) {
  const score = alert.owner_match
  return (
    <Card>
      <CardHeader
        title="Is the carrier the owner?"
        aside={
          score == null ? (
            <Pill tone="gry">No score</Pill>
          ) : (
            <Pill tone="red">Below match threshold</Pill>
          )
        }
      />
      <CardBody>
        <p className="mt-0 mb-3.5 text-[13px] text-mute">
          Appearance comparison between the bag&apos;s owner and the person carrying it
        </p>
        <div className="grid grid-cols-2 gap-2 tab:gap-3.5">
          <PersonPanel
            title={
              alert.owner_track_id == null ? 'Owner' : `Owner · Person #${alert.owner_track_id}`
            }
            badge="Registered"
          />
          <PersonPanel
            title={
              alert.carrier_track_id == null
                ? 'Carrier'
                : `Carrier · Person #${alert.carrier_track_id}`
            }
            badge="Detected"
          />
        </div>
        <div className="mt-4 mb-1.5 flex justify-between text-sm">
          <span>
            Appearance match score: <b>{percent(score) ?? NO_VALUE}</b>
          </span>
          <span className="font-mono text-mute" title="The threshold is shown from Phase 12">
            needs {NO_VALUE}
          </span>
        </div>
        <ProgressBar value={(score ?? 0) * 100} tone="red" label="Appearance match score" />
      </CardBody>
    </Card>
  )
}
