import type { components } from './api/schema'

// TODO(phase-07): the OpenAPI schema has no alert enums yet. Replace these two unions with
// components['schemas'][...] once the alert routes expose them (Data-Contracts §2).
export type AlertType = 'abandoned_bag' | 'possible_theft'
export type AlertStatus =
  'active' | 'acknowledged' | 'resolved' | 'false_alarm' | 'authorised_pickup' | 'confirmed_theft'

export type Tone = 'red' | 'pur' | 'amb' | 'grn' | 'gry' | 'blu'

export const TYPE_PILL: Record<AlertType, { label: string; tone: Tone }> = {
  abandoned_bag: { label: 'Abandoned', tone: 'red' },
  possible_theft: { label: 'Possible theft', tone: 'pur' },
}

/** Labels from Frontend.md §5, colours from the prototype's status pills. */
export const STATUS_PILL: Record<AlertStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'red' },
  acknowledged: { label: 'Acknowledged', tone: 'amb' },
  resolved: { label: 'Resolved', tone: 'grn' },
  false_alarm: { label: 'False alarm', tone: 'gry' },
  authorised_pickup: { label: 'Authorised pickup', tone: 'blu' },
  confirmed_theft: { label: 'Confirmed theft', tone: 'pur' },
}

export const ROLE_LABEL: Record<components['schemas']['UserMe']['role'], string> = {
  operator: 'Security operator',
  admin: 'Administrator',
}

/** Shown wherever a value has no source yet. Never a made-up number (D-06). */
export const NO_VALUE = '—'
