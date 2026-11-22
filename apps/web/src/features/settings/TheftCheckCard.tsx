import { Card, CardBody, CardHeader } from '../../components/Card'
import { RangeField, SwitchRow, Toggle } from '../../components/controls'

/**
 * The slider maps to `theft.owner_match_threshold`. The two switches have no `config.json` key
 * yet (phase-05 gap 6), so Phase 12 decides what they control.
 */
export function TheftCheckCard() {
  return (
    <Card>
      <CardHeader title="Theft check" />
      <CardBody>
        <SwitchRow>
          Alert when a non-owner carries a bag
          <Toggle label="Alert when a non-owner carries a bag" disabled />
        </SwitchRow>
        <RangeField
          id="match"
          label="Appearance match threshold"
          min={50}
          max={90}
          step={5}
          disabled
        />
        <SwitchRow>
          Allow authorised pickup by staff
          <Toggle label="Allow authorised pickup by staff" disabled />
        </SwitchRow>
      </CardBody>
    </Card>
  )
}
