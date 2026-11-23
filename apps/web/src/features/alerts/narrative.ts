import type { Alert } from './api'
import { seconds } from './format'

type NarrativeFields = Pick<
  Alert,
  | 'type'
  | 'bag'
  | 'camera'
  | 'owner_track_id'
  | 'carrier_track_id'
  | 'separation_s'
  | 'owner_away_s'
  | 'owner_match'
>

const lower = (alert: NarrativeFields) => alert.bag.class // "handbag" / "backpack"
const place = (alert: NarrativeFields) => `${alert.camera.name}, ${alert.camera.location}`

/**
 * One plain sentence or two, built only from the alert's own measurements. A value the alert does
 * not have is left out of the sentence, never guessed. Wording: "Possible theft", never "theft"
 * as a fact; the system flags and a person decides.
 */
export function narrative(alert: NarrativeFields): string {
  const bag = `A ${lower(alert)} (bag #${alert.bag.track_id})`
  const owner = alert.owner_track_id == null ? null : `Person #${alert.owner_track_id}`

  if (alert.type === 'abandoned_bag') {
    const first = `${bag} was left at ${place(alert)}.`
    const away = seconds(alert.separation_s)
    if (!owner) return `${first} No owner was linked to it${away ? ` for ${away}` : ''}.`
    return `${first} Its owner, ${owner}, moved away and did not come back for ${away}.`
  }

  const carrier = alert.carrier_track_id == null ? 'Someone' : `Person #${alert.carrier_track_id}`
  const away = seconds(alert.owner_away_s)
  const whose = owner ? `its owner, ${owner}, had been away` : 'its owner had been away'
  const first =
    `${carrier} picked up a ${lower(alert)} (bag #${alert.bag.track_id}) at ${place(alert)}` +
    ` while ${whose}${away ? ` for ${away}` : ''}.`
  if (alert.owner_match == null) return first
  return `${first} Appearance match with the owner: ${Math.round(alert.owner_match * 100)}%.`
}
