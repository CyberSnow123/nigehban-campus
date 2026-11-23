import { Link } from 'react-router-dom'

import { Card, CardBody, CardHeader } from '../../components/Card'
import { KeyValue } from '../../components/KeyValue'
import { Pill } from '../../components/Pill'
import type { Alert } from '../alerts/api'
import { formatDateTime } from '../alerts/format'
import type { LinkedBag } from './personFacts'

/**
 * Profile side card. "Seen in past alerts" is the prototype's own status for a person known only
 * from alerts. The appearance image has no source yet (phase-05 gap 3).
 */
export function PersonProfileCard({ latest, bags }: { latest?: Alert; bags?: LinkedBag[] }) {
  return (
    <Card>
      <CardHeader title="Profile" />
      <CardBody>
        <div className="mb-3.5 grid aspect-[4/3] max-h-60 place-items-center rounded-lg bg-feed px-3 text-center text-xs text-mute">
          Appearance image arrives with the owner fingerprint (FYP-2)
        </div>
        <KeyValue label="Status">{latest && <Pill tone="gry">Seen in past alerts</Pill>}</KeyValue>
        <KeyValue label="Last seen" mono>
          {formatDateTime(latest?.occurred_at)}
        </KeyValue>
        <KeyValue label="Camera">{latest?.camera.name}</KeyValue>
        <KeyValue label="Location">{latest?.camera.location}</KeyValue>
        <KeyValue label="Linked bags">
          {bags?.length ? (
            <span className="flex flex-col items-end gap-0.5">
              {bags.map((bag) => (
                <Link key={bag.key} to={`/alerts/${bag.alertId}`} className="hover:underline">
                  {bag.label}
                </Link>
              ))}
            </span>
          ) : undefined}
        </KeyValue>
        <p className="mt-3.5 mb-0 text-[13px] text-mute">
          Faces are blurred. People are identified only by tracking ID and appearance, not by name.
        </p>
      </CardBody>
    </Card>
  )
}
