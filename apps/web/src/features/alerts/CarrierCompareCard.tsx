import { Card, CardBody, CardHeader } from '../../components/Card'
import { ProgressBar } from '../../components/charts'
import { Pill } from '../../components/Pill'

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
 * "Is the carrier the owner?" for a possible-theft alert. The match score comes from the alert
 * (`owner_match`, Phase 7); the appearance images have no source until Phase 17 (phase-05 gap 3).
 */
export function CarrierCompareCard() {
  return (
    <Card>
      <CardHeader title="Is the carrier the owner?" aside={<Pill tone="gry">No score</Pill>} />
      <CardBody>
        <p className="mt-0 mb-3.5 text-[13px] text-mute">
          Appearance comparison between the bag&apos;s owner and the person carrying it
        </p>
        <div className="grid grid-cols-2 gap-2 tab:gap-3.5">
          <PersonPanel title="Owner" badge="Registered" />
          <PersonPanel title="Carrier" badge="Detected" />
        </div>
        <div className="mt-4 mb-1.5 flex justify-between text-sm">
          <span>
            Appearance match score: <b>—</b>
          </span>
          <span className="font-mono text-mute">needs —</span>
        </div>
        <ProgressBar value={0} tone="red" label="Appearance match score" />
      </CardBody>
    </Card>
  )
}
