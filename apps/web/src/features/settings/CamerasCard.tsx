import { useState } from 'react'

import { Card, CardBody, CardHeader } from '../../components/Card'
import { SwitchRow, Toggle } from '../../components/controls'
import { isAlertSoundOn, setAlertSoundOn } from '../../lib/alertSound'

/** A local preference, saved at once in this browser (not by "Save changes"). */
function AlertSoundToggle() {
  const [on, setOn] = useState(isAlertSoundOn)
  return (
    <Toggle
      label="Alert sound"
      checked={on}
      onChange={(event) => {
        setOn(event.target.checked)
        setAlertSoundOn(event.target.checked)
      }}
    />
  )
}

/**
 * One on/off row per camera (`Camera.is_active`, Phase 12), then the notification switches.
 * Alert sound is a local preference, saved at once. Email alerts have no source (phase-05 gap 7).
 */
export function CamerasCard() {
  return (
    <Card>
      <CardHeader title="Cameras and notifications" />
      <CardBody>
        <p className="m-0 border-b border-line py-3 text-sm text-mute">No cameras added yet.</p>
        <SwitchRow>
          Alert sound
          <AlertSoundToggle />
        </SwitchRow>
        <SwitchRow>
          Email alerts
          <Toggle label="Email alerts" disabled />
        </SwitchRow>
      </CardBody>
    </Card>
  )
}
