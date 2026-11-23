import { Card, CardBody, CardHeader } from '../../components/Card'
import { Donut } from '../../components/charts'
import { NO_VALUE } from '../../lib/constants'
import { useStats } from '../stats/api'

/**
 * The shift view (phase-08 decision 8): everything still open, plus what was closed today.
 * Zeros and a dash total until the counters load.
 */
export function TodayAlertsCard() {
  const stats = useStats().data
  const active = stats?.active ?? 0
  const acknowledged = stats?.acknowledged ?? 0
  const resolved = stats?.closed_today ?? 0
  const total = stats ? `${active + acknowledged + resolved} total` : `${NO_VALUE} total`
  return (
    <Card>
      <CardHeader title="Today's alerts" aside={<span className="font-mono">{total}</span>} />
      <CardBody>
        <Donut
          segments={[
            { label: 'Active', value: active, color: 'var(--red)' },
            { label: 'Acknowledged', value: acknowledged, color: 'var(--org)' },
            { label: 'Resolved', value: resolved, color: 'var(--color-live)' },
          ]}
        />
      </CardBody>
    </Card>
  )
}
