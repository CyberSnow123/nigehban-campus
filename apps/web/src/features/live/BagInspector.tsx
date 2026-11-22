import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader } from '../../components/Card'
import { BagIcon } from '../../components/icons'
import { KeyValue } from '../../components/KeyValue'
import { Pill } from '../../components/Pill'

/**
 * Bag inspector from the prototype: the current detection state of the selected camera and
 * the rows that explain it. There is no live tracking state yet (phase-05 gap 2).
 */
export function BagInspector() {
  return (
    <Card>
      <CardHeader
        title="Bag inspector"
        icon={<BagIcon className="size-5" />}
        aside={<span className="font-mono">—</span>}
      />
      <CardBody>
        <div className="mb-3.5 rounded-xl border border-line bg-wash p-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <b className="text-[13px] text-mute">Current detection state</b>
            <Pill tone="gry">No data</Pill>
          </div>
          <p className="mt-2 mb-0 text-sm">
            Select a running camera to see what the detector sees.
          </p>
        </div>
        <KeyValue label="Owner" mono />
        <KeyValue label="Distance" mono />
        <KeyValue label="Separation time" mono />
        <KeyValue label="Bag movement" mono />
        <KeyValue label="Zone" mono />
        <div className="mt-4 grid gap-2.5">
          <Button variant="dark" disabled title="Available once an alert exists (Phase 7)">
            Open alert
          </Button>
          <Button disabled title="Available once an alert exists (Phase 7)">
            Dismiss false alarm
          </Button>
        </div>
        <p className="mt-4 mb-0 text-[13px] text-mute">Nothing to act on for this camera.</p>
      </CardBody>
    </Card>
  )
}
