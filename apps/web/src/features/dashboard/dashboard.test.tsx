import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setToken } from '../../lib/api/token'
import { makeAlert, page } from '../../test/alerts'
import {
  EMPTY_STATS,
  emptyApi,
  mockApi,
  renderApp,
  reply,
  resetAuthState,
} from '../../test/helpers'

beforeEach(resetAuthState)
afterEach(resetAuthState)

const theft = makeAlert({ id: 'alt_01JD2Y0000000000000000000T', type: 'possible_theft' })
const abandoned = makeAlert()

function openDashboard() {
  setToken('stored.jwt.token', false)
  const calls = mockApi((call) => {
    if (call.path === '/api/stats') {
      return reply(200, {
        ...EMPTY_STATS,
        open_total: 4,
        active: 3,
        acknowledged: 1,
        closed_today: 2,
        today_abandoned: 2,
        today_theft: 1,
      })
    }
    if (call.path === '/api/alerts') {
      const type = call.query.get('type')
      if (call.query.get('page_size') === '1') {
        return reply(200, page([], type === 'possible_theft' ? 1 : 2))
      }
      return reply(200, page([theft, abandoned], 3))
    }
    return emptyApi(call)
  })
  renderApp('/')
  return calls
}

describe('Dashboard on real data', () => {
  it('shows active alerts with the abandoned / possible theft pills', async () => {
    openDashboard()
    const tile = (await screen.findByText('Active alerts')).closest('div')!.parentElement!
    expect(await within(tile).findByText('3')).toBeTruthy()
    expect(await within(tile).findByText('2 abandoned')).toBeTruthy()
    expect(within(tile).getByText('1 possible theft')).toBeTruthy()
    expect(within(tile).queryByText('All clear')).toBeNull()
  })

  it('lists the newest active alerts as cards, with the narrative and a link', async () => {
    const calls = openDashboard()
    const links = await screen.findAllByRole('link', { name: 'View alert →' })
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/alerts/${theft.id}`,
      `/alerts/${abandoned.id}`,
    ])
    expect(screen.getAllByText('Handbag #18 · CAM 01', { selector: 'b' })).toHaveLength(2)
    expect(screen.getByText(/Person #12 picked up a handbag/)).toBeTruthy()
    const list = calls.find((c) => c.path === '/api/alerts' && c.query.get('page_size') === '5')!
    expect(list.query.get('status')).toBe('active')
  })

  it("feeds the donut from open alerts and today's closed ones", async () => {
    openDashboard()
    expect(await screen.findByText('6 total')).toBeTruthy()
  })

  it('never says a bare "Theft"', async () => {
    openDashboard()
    await screen.findAllByRole('link', { name: 'View alert →' })
    expect(screen.queryByText(/^Theft$/)).toBeNull()
    expect(document.body.textContent).not.toMatch(/(^|[^e] )Theft\b/)
  })
})
