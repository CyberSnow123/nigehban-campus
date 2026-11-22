import { Card, CardBody, CardHeader } from '../../components/Card'
import { ProgressBar } from '../../components/charts'
import { KeyValue } from '../../components/KeyValue'

/**
 * "Current target" card from the prototype: the bag being watched, its owner, how far apart
 * they are and how close the abandon timer is to its threshold. There is no live tracking
 * state yet (phase-05 gap 2), so every value is a dash.
 */
export function CurrentTargetCard() {
  return (
    <Card>
      <CardHeader
        title="Current target"
        icon={<span className="size-2.5 rounded-full bg-org" aria-hidden="true" />}
        aside={<span className="font-mono">—</span>}
      />
      <CardBody>
        <KeyValue label="Owner" />
        <KeyValue label="Distance" mono />
        <KeyValue label="Status" />
        <KeyValue label="Separation time" mono />
        <KeyValue label="Threshold" mono />
        <div className="mt-3 mb-1.5 flex justify-between text-[13px]">
          <span className="text-mute">Alert threshold progress</span>
          <b className="font-mono">—</b>
        </div>
        <ProgressBar value={0} tone="amb" label="Alert threshold progress" />
        <p className="mt-3 text-sm text-mute">No bag is being watched.</p>
      </CardBody>
    </Card>
  )
}
