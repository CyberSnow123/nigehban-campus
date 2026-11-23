import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setToken } from '../../lib/api/token'
import { RUN_ID, makeAction, makeAlert, page } from '../../test/alerts'
import {
  OPERATOR,
  apiError,
  mockApi,
  renderApp,
  reply,
  resetAuthState,
  type MockReply,
  type RecordedCall,
} from '../../test/helpers'
import type { Alert } from './api'

beforeEach(resetAuthState)
afterEach(resetAuthState)

const ALERT_PATH = /^\/api\/alerts\/(alt_\w+)$/

/** Signed in, with `routes` answering by path; anything else is the logged-in user. */
function open(path: string, routes: (call: RecordedCall) => MockReply | undefined) {
  setToken('stored.jwt.token', false)
  const calls = mockApi((call) => routes(call) ?? reply(200, OPERATOR))
  renderApp(path)
  return calls
}

const listCalls = (calls: RecordedCall[]) =>
  calls.filter((c) => c.path === '/api/alerts' && c.query.get('page_size') === '50')

describe('Security Alerts list', () => {
  const theft = makeAlert({ type: 'possible_theft', is_demo: true })

  it('shows one row per alert with its badge, pills, links and view link', async () => {
    open('/alerts', (c) => (c.path === '/api/alerts' ? reply(200, page([theft])) : undefined))
    const row = (await screen.findByText('SEC-2026-004-T')).closest('tr')!
    const cells = within(row)
    expect(cells.getByText('Demo data')).toBeTruthy()
    expect(cells.getByText('Possible theft')).toBeTruthy()
    expect(cells.queryByText(/^Theft$/)).toBeNull()
    expect(cells.getByText('Handbag #18')).toBeTruthy()
    expect(cells.getByRole('link', { name: 'Person #2' })).toHaveAttribute(
      'href',
      `/runs/${RUN_ID}/person/2`,
    )
    expect(cells.getByRole('link', { name: 'Person #12' })).toHaveAttribute(
      'href',
      `/runs/${RUN_ID}/person/12`,
    )
    expect(cells.getByText('Main Library')).toBeTruthy()
    expect(cells.getByRole('link', { name: 'View alert SEC-2026-004-T' })).toHaveAttribute(
      'href',
      `/alerts/${theft.id}`,
    )
  })

  it('fills the tiles from the list totals', async () => {
    const totals: Record<string, number> = { all: 9, active: 4, acknowledged: 2, resolved: 3 }
    open('/alerts', (c) => {
      if (c.path !== '/api/alerts') return undefined
      if (c.query.get('page_size') !== '1') return reply(200, page([]))
      return reply(200, page([], totals[c.query.get('status') ?? 'all']))
    })
    for (const [label, value] of [
      ['Total alerts', '9'],
      ['Active', '4'],
      ['Acknowledged', '2'],
      ['Resolved', '3'],
    ]) {
      const tile = (await screen.findAllByText(label))[0]!.parentElement!
      await waitFor(() => expect(tile).toHaveTextContent(value))
    }
  })

  it('sends the filters from the address and resets to page 1 when one changes', async () => {
    const user = userEvent.setup()
    const calls = open('/alerts?type=possible_theft&q=cam%2003&page=2', (c) =>
      c.path === '/api/alerts' ? reply(200, page([], 120)) : undefined,
    )
    await waitFor(() => expect(listCalls(calls).length).toBeGreaterThan(0))
    const first = listCalls(calls)[0]!.query
    expect(first.get('type')).toBe('possible_theft')
    expect(first.get('q')).toBe('cam 03')
    expect(first.get('page')).toBe('2')
    expect(first.has('status')).toBe(false)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'closed')
    await waitFor(() => expect(listCalls(calls).at(-1)!.query.get('status')).toBe('closed'))
    expect(listCalls(calls).at(-1)!.query.get('page')).toBe('1')
  })

  it('shows the pager when there is more than one page', async () => {
    open('/alerts', (c) => (c.path === '/api/alerts' ? reply(200, page([theft], 120)) : undefined))
    const pager = await screen.findByRole('navigation', { name: 'Pagination' })
    expect(within(pager).getByRole('button', { name: '3' })).toBeTruthy()
  })

  it('shows the server error in the table', async () => {
    open('/alerts', (c) =>
      c.path === '/api/alerts'
        ? apiError(500, 'INTERNAL_ERROR', 'Something went wrong.')
        : undefined,
    )
    // One retry (after about 1 s), then the message.
    expect(await screen.findByText('Something went wrong.', {}, { timeout: 4000 })).toBeTruthy()
  })
})

describe('Alert detail', () => {
  /** Serves one alert (mutable, so actions can change it) and its actions. */
  function serve(
    alert: Alert,
    actions = [makeAction()],
    onAction?: (c: RecordedCall) => MockReply,
  ) {
    let current = alert
    const calls = open(`/alerts/${alert.id}`, (c) => {
      if (c.path === `/api/alerts/${alert.id}/actions`) return reply(200, actions)
      if (c.path === `/api/alerts/${alert.id}/snapshot`) return reply(404, {})
      if (c.method === 'POST' && onAction) {
        const answer = onAction(c)
        if (answer.status === 200) current = answer.json as Alert
        return answer
      }
      if (ALERT_PATH.test(c.path)) return reply(200, current)
      return undefined
    })
    return calls
  }

  it('offers only the moves in next_statuses: a closed alert has none', async () => {
    serve(
      makeAlert({ status: 'false_alarm', next_statuses: [], closed_at: '2026-11-22T15:00:00Z' }),
    )
    expect(await screen.findByText(/Closed alerts cannot be reopened/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Acknowledge' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark false alarm' })).toBeNull()
  })

  it('an acknowledged abandoned bag offers Resolve and false alarm, never theft outcomes', async () => {
    serve(makeAlert({ status: 'acknowledged', next_statuses: ['resolved', 'false_alarm'] }))
    expect(await screen.findByRole('button', { name: '✓ Resolve' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark false alarm' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Acknowledge' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Confirm theft' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Authorised pickup/ })).toBeNull()
  })

  it('shows the facts, the narrative and the score for a possible theft', async () => {
    serve(makeAlert({ type: 'possible_theft' }))
    expect(await screen.findByText('THEFT_CHECK')).toBeTruthy()
    expect(screen.getByText('35 s')).toBeTruthy() // owner away
    expect(screen.getByText('3.1 m')).toBeTruthy() // owner distance
    expect(screen.getByText('Below match threshold')).toBeTruthy()
    expect(screen.getByText(/Appearance match score/)).toHaveTextContent('18%')
    expect(screen.getByText(/Person #12 picked up a handbag/)).toBeTruthy()
    expect(screen.getByText(/AI confidence 94%/)).toBeTruthy()
    expect(screen.queryByText(/^Theft$/)).toBeNull()
    // The snapshot answered 404, so the card says so instead of showing a broken image.
    expect(await screen.findByText('Snapshot unavailable')).toBeTruthy()
  })

  it('acknowledges through the API and shows the new state', async () => {
    const user = userEvent.setup()
    const alert = makeAlert()
    const calls = serve(alert, [], () =>
      reply(200, { ...alert, status: 'acknowledged', next_statuses: ['resolved', 'false_alarm'] }),
    )
    await user.click(await screen.findByRole('button', { name: '+ Acknowledge' }))
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/acknowledge'))).toBe(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: '+ Acknowledge' })).toBeNull())
    expect(screen.getAllByText('Acknowledged').length).toBeGreaterThan(0)
  })

  it('closes as a false alarm with a note from the dialog', async () => {
    const user = userEvent.setup()
    const alert = makeAlert()
    const calls = serve(alert, [], () =>
      reply(200, { ...alert, status: 'false_alarm', next_statuses: [] }),
    )
    await user.click(await screen.findByRole('button', { name: 'Mark false alarm' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Mark as a false alarm?')).toBeTruthy()
    await user.type(within(dialog).getByLabelText(/Note/), 'Owner came back')
    expect(within(dialog).getByText('15 / 500')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Close as False alarm' }))

    const post = calls.find((c) => c.method === 'POST' && c.path.endsWith('/close'))
    expect(post?.body).toEqual({ outcome: 'false_alarm', note: 'Owner came back' })
    expect(await screen.findByText(/Closed alerts cannot be reopened/)).toBeTruthy()
  })

  it('cancelling the dialog sends nothing', async () => {
    const user = userEvent.setup()
    const calls = serve(makeAlert({ type: 'possible_theft' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm theft' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('shows the server message when someone else got there first', async () => {
    const user = userEvent.setup()
    serve(makeAlert(), [], () =>
      apiError(409, 'INVALID_TRANSITION', 'This alert is already acknowledged.'),
    )
    await user.click(await screen.findByRole('button', { name: '+ Acknowledge' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This alert is already acknowledged.',
    )
  })

  it('lists the timeline oldest first, starting with the alert itself', async () => {
    serve(makeAlert({ status: 'resolved', next_statuses: [], closed_at: '2026-11-22T15:00:00Z' }), [
      makeAction(),
      makeAction({
        id: 'act_01JD2Z0000000000000000000B',
        action: 'close',
        from_status: 'acknowledged',
        to_status: 'resolved',
        note: 'Owner collected it',
        at: '2026-11-22T15:00:00Z',
      }),
    ])
    const timeline = (await screen.findByRole('heading', { name: 'Timeline' })).closest(
      'div',
    )!.parentElement!
    await waitFor(() => expect(within(timeline).getAllByRole('listitem')).toHaveLength(3))
    const items = within(timeline)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('b')?.textContent)
    expect(items).toEqual([
      'Alert raised',
      'Acknowledged by Duty Operator',
      'Closed by Duty Operator',
    ])
    expect(within(timeline).getByText('“Owner collected it”')).toBeTruthy()
  })

  it('says when an alert does not exist', async () => {
    open('/alerts/alt_01JD2Y0000000000000000000Z', (c) =>
      ALERT_PATH.test(c.path) ? apiError(404, 'NOT_FOUND', 'No alert with this ID.') : undefined,
    )
    expect(await screen.findByText('Alert not found')).toBeTruthy()
  })
})
