import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setToken } from '../../lib/api/token'
import { makeAlert, page } from '../../test/alerts'
import {
  emptyApi,
  mockApi,
  renderApp,
  reply,
  resetAuthState,
  type RecordedCall,
} from '../../test/helpers'
import { historyParams } from './api'

beforeEach(resetAuthState)
afterEach(resetAuthState)

const closed = makeAlert({
  type: 'possible_theft',
  status: 'false_alarm',
  closed_at: '2026-11-22T15:00:00Z',
  next_statuses: [],
  is_demo: true,
})

function openHistory(path = '/history', total = 1) {
  setToken('stored.jwt.token', false)
  const calls = mockApi((call) => {
    if (call.path === '/api/alerts') return reply(200, { ...page([closed], total), page_size: 20 })
    if (call.path === '/api/stats/history') {
      return reply(200, { total: 14, false_alarms: 3, avg_response_s: 130 })
    }
    return emptyApi(call)
  })
  const router = renderApp(path)
  return { calls, router }
}

const lastList = (calls: RecordedCall[]) => calls.filter((c) => c.path === '/api/alerts').at(-1)!
const lastStats = (calls: RecordedCall[]) =>
  calls.filter((c) => c.path === '/api/stats/history').at(-1)!

describe('History on real data', () => {
  it('lists closed alerts with the outcome, badge and view link', async () => {
    const { calls } = openHistory()
    const row = (await screen.findByText('SEC-2026-004-T')).closest('tr')!
    const cells = within(row)
    expect(cells.getByText('False alarm')).toBeTruthy()
    expect(cells.getByText('Demo data')).toBeTruthy()
    expect(cells.getByText('Possible theft')).toBeTruthy()
    expect(cells.getByText('Handbag #18')).toBeTruthy()
    expect(cells.getByRole('link', { name: 'View alert SEC-2026-004-T' })).toHaveAttribute(
      'href',
      `/alerts/${closed.id}`,
    )
    const query = lastList(calls).query
    expect(query.get('status')).toBe('closed')
    expect(query.get('page_size')).toBe('20')
    // The last 7 days by default.
    const from = Date.parse(query.get('from')!)
    expect(Date.now() - from).toBeGreaterThan(7 * 86_400_000 - 60_000)
    expect(Date.now() - from).toBeLessThan(7 * 86_400_000 + 60_000)
  })

  it('shows the counters, with a label that follows the range', async () => {
    const { calls } = openHistory()
    expect(await screen.findByText('14')).toBeTruthy()
    expect(screen.getByText('2 min 10 s')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Alerts this week')).toBeTruthy()

    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Date range' }), '1')
    expect(await screen.findByText('Alerts in last 24 hours')).toBeTruthy()
    await waitFor(() => expect(lastStats(calls).query.get('days')).toBe('1'))
  })

  it('sends the type, outcome and search filters', async () => {
    const { calls, router } = openHistory('/history?q=bag%2018')
    await screen.findByText('SEC-2026-004-T')
    expect(screen.getByText('Search: bag 18')).toBeTruthy()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Possible theft' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Outcome' }), 'false_alarm')
    await waitFor(() => expect(lastList(calls).query.get('status')).toBe('false_alarm'))
    const query = lastList(calls).query
    expect(query.get('type')).toBe('possible_theft')
    expect(query.get('q')).toBe('bag 18')
    expect(lastStats(calls).query.get('type')).toBe('possible_theft')
    expect(router.state.location.search).toBe('?q=bag+18&type=possible_theft&outcome=false_alarm')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(lastList(calls).query.get('q')).toBeNull())
  })

  it('pages through the records', async () => {
    const { calls } = openHistory('/history', 45)
    await screen.findByText('SEC-2026-004-T')
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 of 45 records')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(lastList(calls).query.get('page')).toBe('2'))
  })

  it('keeps a top-bar search on History, with the other filters', async () => {
    const { router } = openHistory('/history?type=abandoned_bag')
    await screen.findByText('SEC-2026-004-T')
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'CAM 03{Enter}')
    expect(router.state.location.pathname).toBe('/history')
    expect(router.state.location.search).toBe('?type=abandoned_bag&q=CAM+03')
  })
})

describe('historyParams', () => {
  it('turns the filters into a list request', () => {
    const now = Date.parse('2026-11-23T10:00:00Z')
    expect(historyParams({ type: 'all', outcome: 'all', days: 30, q: '', page: 2 }, now)).toEqual({
      status: 'closed',
      type: undefined,
      q: undefined,
      from: '2026-10-24T10:00:00.000Z',
      page: 2,
      page_size: 20,
    })
  })
})

describe('closed alert detail', () => {
  it('highlights History in the nav and links back to it', async () => {
    setToken('stored.jwt.token', false)
    mockApi((call) => {
      if (call.path === `/api/alerts/${closed.id}`) return reply(200, closed)
      if (call.path.endsWith('/actions')) return reply(200, [])
      if (call.path.endsWith('/snapshot')) return reply(404, {})
      return emptyApi(call)
    })
    renderApp(`/alerts/${closed.id}`)
    expect(await screen.findByRole('link', { name: /Back to History/ })).toHaveAttribute(
      'href',
      '/history',
    )
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!
    await waitFor(() =>
      expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    )
    expect(within(nav).getByRole('link', { name: /Alerts/ })).not.toHaveAttribute('aria-current')
  })
})
