/**
 * What a person's alerts say about them (phase-08 decision 14). Pure functions, so they can be
 * tested without the page. Tracks are only known through alerts until run telemetry exists.
 */
import type { Tone } from '../../lib/constants'
import type { Alert } from '../alerts/api'
import { bagName } from '../alerts/format'

export type AlertRole = 'owner' | 'carrier'

/** This person's part in one alert. A person can't be both in the same alert. */
export function roleIn(alert: Alert, trackId: number): AlertRole | null {
  if (alert.carrier_track_id === trackId) return 'carrier'
  if (alert.owner_track_id === trackId) return 'owner'
  return null
}

export const ROLE_PILL: Record<AlertRole, { label: string; tone: Tone }> = {
  owner: { label: 'Owner', tone: 'blu' },
  carrier: { label: 'Carrier', tone: 'pur' },
}

/** The header pill, in the prototype's words: "Bag owner", "Carrier" or both. */
export function personRole(alerts: Alert[], trackId: number): { label: string; tone: Tone } | null {
  const roles = new Set(alerts.map((alert) => roleIn(alert, trackId)))
  const owner = roles.has('owner')
  const carrier = roles.has('carrier')
  if (owner && carrier) return { label: 'Bag owner and carrier', tone: 'pur' }
  if (carrier) return { label: 'Carrier', tone: 'pur' }
  if (owner) return { label: 'Bag owner', tone: 'blu' }
  return null
}

export interface LinkedBag {
  key: string
  label: string
  alertId: string
}

/** "Handbag #18 (owner)" / "(carried, not owner)", once per bag and role, newest first. */
export function linkedBags(alerts: Alert[], trackId: number): LinkedBag[] {
  const bags = new Map<string, LinkedBag>()
  for (const alert of alerts) {
    const role = roleIn(alert, trackId)
    if (!role) continue
    const key = `${alert.bag.track_id}-${role}`
    if (bags.has(key)) continue
    const note = role === 'carrier' ? '(carried, not owner)' : '(owner)'
    bags.set(key, { key, label: `${bagName(alert)} ${note}`, alertId: alert.id })
  }
  return [...bags.values()]
}
