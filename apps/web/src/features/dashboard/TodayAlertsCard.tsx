import { Card, CardBody, CardHeader } from '../../components/Card'
import { Donut } from '../../components/charts'

/** Today's alerts by status. Counts come from `/api/stats` in Phase 8; until then all are 0. */
export function TodayAlertsCard() {
  return (
    <Card>
      <CardHeader title="Today's alerts" aside={<span className="font-mono">0 total</span>} />
      <CardBody>
        <Donut
          segments={[
            { label: 'Active', value: 0, color: 'var(--red)' },
            { label: 'Acknowledged', value: 0, color: 'var(--org)' },
            { label: 'Resolved', value: 0, color: 'var(--color-live)' },
          ]}
        />
      </CardBody>
    </Card>
  )
}
