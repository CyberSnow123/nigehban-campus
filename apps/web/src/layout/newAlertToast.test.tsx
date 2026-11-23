import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { playAlertSound } from '../lib/alertSound'
import { setToken } from '../lib/api/token'
import {
  EMPTY_STATS,
  emptyApi,
  mockApi,
  renderApp,
  reply,
  resetAuthState,
  type RecordedCall,
} from '../test/helpers'

// Poll fast, so a test sees several polls without waiting 3 s for each.
vi.mock('../lib/api/query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/query')>()),
  POLL_MS: 40,
}))
vi.mock('../lib/alertSound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/alertSound')>()),
  playAlertSound: vi.fn(),
}))

beforeEach(resetAuthState)
afterEach(() => {
  resetAuthState()
  vi.mocked(playAlertSound).mockClear()
})

const FIRST = {
  id: 'alt_01JD2Y0000000000000000000A',
  ref_code: 'SEC-2026-011-A',
  type: 'abandoned_bag',
  camera_name: 'CAM 01',
} as const
const SECOND = {
  id: 'alt_01JD2Y0000000000000000000B',
  ref_code: 'SEC-2026-012-T',
  type: 'possible_theft',
  camera_name: 'CAM 03',
} as const

type StatsReply = typeof EMPTY_STATS | Record<string, unknown>

/** Signed in on Settings (a page with no alert lists). `/api/stats` answers poll by poll. */
async function openWithStats(answer: (poll: number) => StatsReply) {
  setToken('stored.jwt.token', false)
  let polls = 0
  const calls = mockApi((call: RecordedCall) =>
    call.path === '/api/stats' ? reply(200, answer(polls++)) : emptyApi(call),
  )
  renderApp('/settings')
  await screen.findByRole('main')
  return { statsCalls: () => calls.filter((c) => c.path === '/api/stats').length }
}

const stats = (overrides: object) => ({ ...EMPTY_STATS, ...overrides })
const liveRegion = () => screen.getByRole('status', { name: 'Notifications' })

describe('new-alert toast', () => {
  it('gives no toast for the alerts already there when the page opens', async () => {
    const { statsCalls } = await openWithStats(() =>
      stats({ latest_alert: FIRST, today_abandoned: 1, active: 1, open_total: 1 }),
    )
    await waitFor(() => expect(statsCalls()).toBeGreaterThanOrEqual(3))
    expect(within(liveRegion()).queryByRole('link')).toBeNull()
    expect(playAlertSound).not.toHaveBeenCalled()
  })

  it('names and links a new alert, and plays the sound', async () => {
    await openWithStats((poll) =>
      poll === 0
        ? stats({ latest_alert: FIRST, today_abandoned: 1 })
        : stats({ latest_alert: SECOND, today_abandoned: 1, today_theft: 1 }),
    )
    const link = await within(liveRegion()).findByRole('link', { name: 'View alert →' })
    expect(link).toHaveAttribute('href', `/alerts/${SECOND.id}`)
    expect(liveRegion()).toHaveTextContent('New possible theft alert SEC-2026-012-T at CAM 03.')
    expect(liveRegion().textContent).not.toMatch(/\bTheft\b/)
    expect(playAlertSound).toHaveBeenCalledTimes(1)
  })

  it('gives one toast for several alerts that arrive within one poll', async () => {
    await openWithStats((poll) =>
      poll === 0
        ? stats({ latest_alert: FIRST, today_abandoned: 1 })
        : stats({ latest_alert: SECOND, today_abandoned: 2, today_theft: 1 }),
    )
    const link = await within(liveRegion()).findByRole('link', { name: 'View active alerts →' })
    expect(link).toHaveAttribute('href', '/alerts?status=active')
    expect(liveRegion()).toHaveTextContent('2 new alerts.')
    expect(playAlertSound).toHaveBeenCalledTimes(1)
  })

  it('stays silent when the sound is turned off, and closes on ×', async () => {
    localStorage.setItem('nigehban-alert-sound', 'off')
    await openWithStats((poll) => stats({ latest_alert: poll === 0 ? FIRST : SECOND }))
    await within(liveRegion()).findByRole('link', { name: 'View alert →' })
    expect(playAlertSound).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(within(liveRegion()).queryByRole('link')).toBeNull()
  })

  it('treats the first alert on an empty system as new', async () => {
    await openWithStats((poll) =>
      stats({ latest_alert: poll === 0 ? null : FIRST, today_abandoned: 1 }),
    )
    const link = await within(liveRegion()).findByRole('link', { name: 'View alert →' })
    expect(link).toHaveAttribute('href', `/alerts/${FIRST.id}`)
    expect(liveRegion()).toHaveTextContent('New abandoned bag alert SEC-2026-011-A at CAM 01.')
  })
})

describe('shell badge', () => {
  it('shows open alerts from the stats, and hides at 0', async () => {
    await openWithStats((poll) => stats({ open_total: poll === 0 ? 0 : 4 }))
    const nav = (await screen.findAllByRole('navigation', { name: 'Main' }))[0]!
    expect(within(nav).queryByText('Open alerts:')).toBeNull()
    expect(await within(nav).findByText('4')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Alerts, 4 open' })).toBeTruthy()
  })
})
