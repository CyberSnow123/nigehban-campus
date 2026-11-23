import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Providers } from '../app/providers'
import { setToken } from '../lib/api/token'
import { makeAlert, page } from '../test/alerts'
import { OPERATOR, mockApi, renderApp, reply, resetAuthState } from '../test/helpers'
import { AlertDetailView } from './alerts/AlertDetailPage'

/**
 * One test per page, listing every section the prototype (prototype/dashboard.html) has on that
 * view. If a section is dropped, its test fails. Sections have no data yet, so each is checked in
 * its empty state.
 */

beforeEach(resetAuthState)
afterEach(resetAuthState)

async function openSignedIn(path: string) {
  setToken('stored.jwt.token', false)
  mockApi(({ path: url }) => {
    if (url === '/api/alerts') return reply(200, page([]))
    // An alert detail that never arrives: the page stays in its loading layout.
    if (url.startsWith('/api/alerts/')) return new Promise<never>(() => {})
    return reply(200, OPERATOR)
  })
  const router = renderApp(path)
  await screen.findByRole('main')
  return router
}

const heading = (name: string | RegExp, level?: number) =>
  screen.getByRole('heading', { name, level })
const columnHeaders = () => screen.getAllByRole('columnheader').map((th) => th.textContent)

describe('Login', () => {
  it('has the art panel, the form, the notice and the footer', async () => {
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
    for (const text of [
      'AI surveillance suite',
      'Campus node',
      'Campus optical AI',
      'Real-time object tracking',
      'Telemetry link',
      'Person-bag association',
      'Live security shield active',
      'Authorised campus security personnel only.',
    ]) {
      expect(screen.getByText(text)).toBeTruthy()
    }
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy()
    expect(screen.getByLabelText('Remember this terminal session')).toBeChecked()
    // Phase 4 removed these made-up claims on purpose (phase-05 login table).
    expect(screen.queryByText(/99\.98/)).toBeNull()
    expect(screen.queryByText(/all data is sample data/i)).toBeNull()
  })
})

describe('Dashboard', () => {
  it('has four tiles, the camera preview, current target, active alerts and the donut', async () => {
    await openSignedIn('/')
    expect(heading('Dashboard', 1)).toBeTruthy()
    expect(screen.getByText('Live overview of campus cameras and unattended bags')).toBeTruthy()
    for (const label of ['Active cameras', 'People tracked', 'Bags tracked', 'Active alerts']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    // No source yet: each tile says so instead of showing a number.
    expect(screen.getAllByRole('img', { name: 'Not available yet' })).toHaveLength(4)
    expect(heading('Camera preview')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open live view' })).toHaveAttribute('href', '/live')
    expect(heading('Current target')).toBeTruthy()
    for (const label of ['Owner', 'Distance', 'Status', 'Separation time', 'Threshold']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('progressbar', { name: 'Alert threshold progress' })).toBeTruthy()
    expect(screen.getByText('No active alerts. Everything is with its owner.')).toBeTruthy()
    expect(heading("Today's alerts")).toBeTruthy()
    for (const label of ['Active', 'Acknowledged', 'Resolved']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})

describe('Live Monitoring', () => {
  it('has the layout switch, camera select, feed, state line and bag inspector', async () => {
    const user = userEvent.setup()
    await openSignedIn('/live')
    expect(screen.getByText('Real-time CCTV feeds with tracking overlays')).toBeTruthy()
    expect(screen.getByText('No runs')).toBeTruthy()
    expect(screen.getByRole('button', { name: '1×1 Feed', pressed: true })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2×2 Grid', pressed: false })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Camera' })).toBeDisabled()
    expect(screen.getByText(/Tracking — persons/)).toBeTruthy()
    expect(screen.getByText('Model: YOLO26n + ByteTrack')).toBeTruthy()
    expect(heading('Bag inspector')).toBeTruthy()
    expect(screen.getByText('Current detection state')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open alert' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Dismiss false alarm' })).toBeDisabled()
    expect(screen.getByText('Nothing to act on for this camera.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '2×2 Grid' }))
    expect(heading('All cameras')).toBeTruthy()
    expect(screen.getByRole('button', { name: '2×2 Grid', pressed: true })).toBeTruthy()
  })
})

describe('Security Alerts', () => {
  it('has four tiles, the type and status filters, refresh and the nine-column table', async () => {
    await openSignedIn('/alerts')
    expect(screen.getByText('All abandoned-bag and possible-theft alerts')).toBeTruthy()
    for (const label of ['Total alerts', 'Active', 'Acknowledged', 'Resolved']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    for (const name of ['All', 'Abandoned', 'Possible theft']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    const status = screen.getByRole('combobox', { name: 'Status' })
    expect(
      within(status)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['All statuses', 'Active', 'Acknowledged', 'Resolved / closed'])
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
    expect(columnHeaders()).toEqual([
      'Alert ID',
      'Type',
      'Bag',
      'Owner',
      'Carrier',
      'Camera',
      'Time',
      'Status',
      'Action',
    ])
    expect(await screen.findByText('No alerts yet.')).toBeTruthy()
  })

  it('keeps filters in the address and shows the search note with a clear button', async () => {
    const user = userEvent.setup()
    const router = await openSignedIn('/alerts?q=bag%2031&type=possible_theft&status=nonsense')
    expect(screen.getByRole('button', { name: 'Possible theft', pressed: true })).toBeTruthy()
    // An unknown status falls back to "all".
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('all')
    expect(await screen.findByText('No alerts match these filters.')).toBeTruthy()
    expect(screen.getByText(/Search: bag 31/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(new URLSearchParams(router.state.location.search).has('q')).toBe(false)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'closed')
    expect(new URLSearchParams(router.state.location.search).get('status')).toBe('closed')
  })
})

describe('Alert detail', () => {
  // The view is shown on its own here (no API): the snapshot request is answered by nothing.
  const inRouter = (type: 'abandoned_bag' | 'possible_theft') => {
    mockApi(() => new Promise<never>(() => {}))
    render(
      <Providers>
        <MemoryRouter>
          <AlertDetailView alert={makeAlert({ type })} />
        </MemoryRouter>
      </Providers>,
    )
  }

  it('has the sections every alert has', () => {
    inRouter('abandoned_bag')
    expect(screen.getByRole('link', { name: /Back to Alerts/ })).toHaveAttribute('href', '/alerts')
    expect(screen.getByText(/REF SEC-2026-003-A · Triggered/)).toBeTruthy()
    expect(heading(/CAM 01 — Main Library snapshot/)).toBeTruthy()
    expect(screen.getByText('Loading snapshot…')).toBeTruthy()
    expect(screen.getByText(/Detection zone/)).toBeTruthy()
    expect(screen.getByText(/AI confidence/)).toBeTruthy()
    expect(screen.getByText('Automated incident narrative')).toBeTruthy()
    expect(heading('Alert details')).toBeTruthy()
  })

  it('an abandoned bag shows its rows, Resolve, and no carrier comparison', () => {
    inRouter('abandoned_bag')
    expect(heading(/^Alert SEC-2026-003-A — Abandoned/, 1)).toBeTruthy()
    expect(screen.getByText('ABANDON_CHECK')).toBeTruthy()
    for (const row of ['Owner', 'Distance', 'Separation', 'Threshold']) {
      expect(screen.getByText(row)).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: '+ Acknowledge' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '✓ Resolve' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mark false alarm' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Confirm theft' })).toBeNull()
    expect(screen.queryByText('Is the carrier the owner?')).toBeNull()
  })

  it('a possible theft shows the carrier comparison and the theft outcomes', () => {
    inRouter('possible_theft')
    expect(heading(/^Alert SEC-2026-004-T — Possible theft/, 1)).toBeTruthy()
    expect(screen.getByText('THEFT_CHECK')).toBeTruthy()
    expect(heading('Is the carrier the owner?')).toBeTruthy()
    expect(screen.getByText(/Appearance match score/)).toBeTruthy()
    for (const row of ['Registered owner', 'Active carrier', 'Owner away', 'Bag movement']) {
      expect(screen.getByText(row)).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Confirm theft' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Authorised pickup/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '✓ Resolve' })).toBeNull()
    // The type label is "Possible theft", never a bare "Theft".
    expect(screen.queryByText(/^Theft$/)).toBeNull()
  })

  it('an alert that has not loaded yet shows only the fields every alert has', async () => {
    await openSignedIn('/alerts/alt_01')
    expect(heading('Alert', 1)).toBeTruthy()
    expect(screen.queryByText('Is the carrier the owner?')).toBeNull()
    expect(screen.queryByText('Separation')).toBeNull()
  })
})

describe('Person', () => {
  it('has the sighting, the profile, the privacy note and the alerts table', async () => {
    await openSignedIn('/runs/run_01/person/7')
    expect(heading(/^Person #7/, 1)).toBeTruthy()
    expect(screen.getByText('P-07')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Back to Alerts/ })).toBeTruthy()
    expect(heading('Last seen')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Track in Live Monitoring' })).toBeTruthy()
    expect(heading('Profile')).toBeTruthy()
    for (const row of ['Status', 'Last seen', 'Camera', 'Location', 'Linked bags']) {
      expect(screen.getAllByText(row).length).toBeGreaterThan(0)
    }
    expect(
      screen.getByText(
        'Faces are blurred. People are identified only by tracking ID and appearance, not by name.',
      ),
    ).toBeTruthy()
    expect(heading('Alerts involving Person #7')).toBeTruthy()
    expect(columnHeaders()).toEqual(['Alert', 'Type', 'Role', 'Bag', 'When', 'Status', 'Action'])
    expect(
      screen.getByText('No alerts involve this person. They are only being tracked.'),
    ).toBeTruthy()
  })

  it.each(['abc', '0', '-3', '12x'])('shows an unknown-person card for track "%s"', async (id) => {
    await openSignedIn(`/runs/run_01/person/${id}`)
    expect(heading('Unknown person')).toBeTruthy()
    expect(screen.queryByText('Profile')).toBeNull()
  })
})

describe('History', () => {
  it('has three tiles, the filters, the seven-column table and the pager', async () => {
    await openSignedIn('/history')
    expect(screen.getByText('Past alerts and how they were resolved')).toBeTruthy()
    for (const label of ['Alerts this week', 'Average response', 'False alarms']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    for (const name of ['All', 'Abandoned', 'Possible theft']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    const range = screen.getByRole('combobox', { name: 'Date range' })
    expect(range).toHaveValue('7')
    expect(columnHeaders()).toEqual([
      'Date & time',
      'Alert ID',
      'Type',
      'Bag',
      'Camera',
      'Outcome',
      'Action',
    ])
    expect(screen.getByText('No records for this filter.')).toBeTruthy()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 0 of 0 records')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})

describe('Settings', () => {
  it('has the three cards, every control and the three buttons', async () => {
    const user = userEvent.setup()
    const router = await openSignedIn('/settings')
    expect(screen.getByText('Detection rules, theft check, cameras and notifications')).toBeTruthy()
    for (const name of ['Detection rules', 'Theft check', 'Cameras and notifications']) {
      expect(heading(name)).toBeTruthy()
    }
    for (const label of [
      'Near distance',
      'Owner confirmed after',
      'Abandon after',
      'Appearance match threshold',
    ]) {
      expect(screen.getByRole('slider', { name: label })).toBeDisabled()
    }
    for (const label of [
      'Alert when a non-owner carries a bag',
      'Allow authorised pickup by staff',
      'Alert sound',
      'Email alerts',
    ]) {
      expect(screen.getByRole('switch', { name: label })).toBeDisabled()
    }
    expect(screen.getByText('No cameras added yet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset to defaults' })).toBeDisabled()

    // The page's own Log out button works now. The sidebar has one too, so pick the page's.
    const buttons = screen.getAllByRole('button', { name: 'Log out' })
    await user.click(buttons[buttons.length - 1]!)
    expect(router.state.location.pathname).toBe('/logged-out')
  })
})
