/** Alert payloads for web tests, shaped like `GET /api/alerts/{id}` (Data-Contracts §5). */
import type { Alert, AlertAction } from '../features/alerts/api'

export const RUN_ID = 'run_01JD2W0000000000000000000A'

export function makeAlert(overrides: Partial<Alert> = {}): Alert {
  const theft = overrides.type === 'possible_theft'
  return {
    id: 'alt_01JD2Y0000000000000000000A',
    ref_code: theft ? 'SEC-2026-004-T' : 'SEC-2026-003-A',
    type: 'abandoned_bag',
    status: 'active',
    is_demo: false,
    camera: { id: 'cam_01JD2V0000000000000000000A', name: 'CAM 01', location: 'Main Library' },
    run_id: RUN_ID,
    event_id: 'evt_01JD2X0000000000000000000A',
    occurred_at: '2026-11-22T14:47:05Z',
    video_ts_s: 125.4,
    bag: { track_id: 18, class: 'handbag', bbox: [812, 440, 905, 560] },
    owner_track_id: 2,
    carrier_track_id: theft ? 12 : null,
    separation_s: theft ? null : 65,
    owner_distance_m: 3.1,
    owner_away_s: theft ? 35 : null,
    confidence: 0.94,
    owner_match: theft ? 0.18 : null,
    snapshot_url: '/api/alerts/alt_01JD2Y0000000000000000000A/snapshot',
    next_statuses: theft
      ? ['acknowledged', 'resolved', 'false_alarm', 'authorised_pickup', 'confirmed_theft']
      : ['acknowledged', 'resolved', 'false_alarm'],
    acknowledged_by: null,
    acknowledged_at: null,
    closed_at: null,
    created_at: '2026-11-22T14:47:06Z',
    ...overrides,
  }
}

export function makeAction(overrides: Partial<AlertAction> = {}): AlertAction {
  return {
    id: 'act_01JD2Z0000000000000000000A',
    alert_id: 'alt_01JD2Y0000000000000000000A',
    action: 'acknowledge',
    from_status: 'active',
    to_status: 'acknowledged',
    user: { id: 'usr_01JD2X0000000000000000000A', display_name: 'Duty Operator' },
    note: null,
    at: '2026-11-22T14:50:00Z',
    ...overrides,
  }
}

export const page = (items: Alert[], total = items.length) => ({
  items,
  total,
  page: 1,
  page_size: 50,
})
