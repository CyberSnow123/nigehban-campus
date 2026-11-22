import { Card, CardBody, CardHeader } from '../../components/Card'
import { KeyValue } from '../../components/KeyValue'

/** Profile side card. The appearance image has no source yet (phase-05 gap 3). */
export function PersonProfileCard() {
  return (
    <Card>
      <CardHeader title="Profile" />
      <CardBody>
        <div className="mb-3.5 grid aspect-[4/3] max-h-60 place-items-center rounded-lg bg-feed px-3 text-center text-xs text-mute">
          Appearance image arrives with the owner fingerprint (FYP-2)
        </div>
        <KeyValue label="Status" />
        <KeyValue label="Last seen" mono />
        <KeyValue label="Camera" />
        <KeyValue label="Location" />
        <KeyValue label="Linked bags" />
        <p className="mt-3.5 mb-0 text-[13px] text-mute">
          Faces are blurred. People are identified only by tracking ID and appearance, not by name.
        </p>
      </CardBody>
    </Card>
  )
}
