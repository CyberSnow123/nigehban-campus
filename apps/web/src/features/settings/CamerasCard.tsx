import { Card, CardBody, CardHeader } from '../../components/Card'
import { SwitchRow, Toggle } from '../../components/controls'

/**
 * One on/off row per camera (`Camera.is_active`, Phase 12), then the notification switches.
 * Alert sound is a local preference (Phase 8). Email alerts have no source (phase-05 gap 7).
 */
export function CamerasCard() {
  return (
    <Card>
      <CardHeader title="Cameras and notifications" />
      <CardBody>
        <p className="m-0 border-b border-line py-3 text-sm text-mute">No cameras added yet.</p>
        <SwitchRow>
          Alert sound
          <Toggle label="Alert sound" disabled />
        </SwitchRow>
        <SwitchRow>
          Email alerts
          <Toggle label="Email alerts" disabled />
        </SwitchRow>
      </CardBody>
    </Card>
  )
}
