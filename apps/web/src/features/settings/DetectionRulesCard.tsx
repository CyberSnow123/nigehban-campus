import { Card, CardBody, CardHeader } from '../../components/Card'
import { RangeField } from '../../components/controls'

/**
 * Sliders for the thresholds in `config.json`: `association.near_ratio`, `association.min_frames`
 * and `abandon.threshold_s`. Values load in Phase 12.
 */
export function DetectionRulesCard() {
  return (
    <Card>
      <CardHeader title="Detection rules" />
      <CardBody>
        <RangeField id="near" label="Near distance" min={0.3} max={1} step={0.1} disabled />
        <RangeField id="owner" label="Owner confirmed after" min={10} max={60} step={5} disabled />
        <RangeField id="abandon" label="Abandon after" min={30} max={300} step={10} disabled />
      </CardBody>
    </Card>
  )
}
