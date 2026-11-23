import type { components } from './api/schema'

// Generated from the API's OpenAPI schema (Data-Contracts §2); never written by hand.
export type AlertType = components['schemas']['EventType']
export type AlertStatus = components['schemas']['AlertStatus']
export type BagClass = components['schemas']['BagClass']

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

export const BAG_LABEL: Record<BagClass, string> = {
  handbag: 'Handbag',
  backpack: 'Backpack',
}

export const ROLE_LABEL: Record<components['schemas']['UserMe']['role'], string> = {
  operator: 'Security operator',
  admin: 'Administrator',
}

/** Shown wherever a value has no source yet. Never a made-up number (D-06). */
export const NO_VALUE = '—'
