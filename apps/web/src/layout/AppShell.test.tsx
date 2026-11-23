import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Providers } from '../app/providers'
import { routes } from '../app/router'

import { getToken, setToken } from '../lib/api/token'
import { emptyApi, mockApi, renderApp, resetAuthState } from '../test/helpers'
import { initials } from './initials'
import { navKeyFor } from './navItems'
import { useShellStatus } from './useShellStatus'

vi.mock('./useShellStatus', () => ({
  useShellStatus: vi.fn(() => ({ openAlerts: 0, hasLiveRun: false })),
}))

beforeEach(() => {
  resetAuthState()
  vi.mocked(useShellStatus).mockReturnValue({ openAlerts: 0, hasLiveRun: false })
})
afterEach(resetAuthState)

/** Opens `path` as a signed-in operator. */
async function openSignedIn(path: string) {
  setToken('stored.jwt.token', false)
  mockApi(emptyApi)
  const router = renderApp(path)
  await screen.findByRole('main')
  return router
}

const ROUTES: Array<[string, RegExp]> = [
  ['/', /^Dashboard$/],
  ['/live', /^Live Monitoring/],
  ['/alerts', /^Security Alerts$/],
  ['/alerts/alt_01', /^Alert$/],
  ['/history', /^History$/],
  ['/runs/run_01/person/12', /^Person #12/],
  ['/settings', /^Settings$/],
]

describe('every signed-in route sits inside the shell', () => {
  it.each(ROUTES)('%s shows its heading, the nav and the user block', async (path, heading) => {
    await openSignedIn(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2)
    expect(screen.getByRole('search')).toBeInTheDocument()
    // Set in a passive effect; the first test in the file can get there after the heading.
    await waitFor(() => expect(document.title).toMatch(/· Nigehban Campus$/))
  })
})

describe('navigation', () => {
  it.each([
    ['/alerts/alt_01', 'Alerts'],
    ['/runs/run_01/person/12', 'Alerts'],
    ['/history', 'History'],
    ['/live', 'Live Monitoring'],
  ])('%s highlights %s in the sidebar and the tab bar', async (path, label) => {
    await openSignedIn(path)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(2)
    for (const link of current)
      expect(link).toHaveTextContent(label === 'Live Monitoring' ? /^Live/ : label)
  })

  it('maps paths to nav keys', () => {
    expect(navKeyFor('/')).toBe('dashboard')
    expect(navKeyFor('/alerts/x')).toBe('alerts')
    expect(navKeyFor('/runs/a/person/1')).toBe('alerts')
    expect(navKeyFor('/nowhere')).toBeNull()
  })

  it('moves focus to the page after a route change, and the skip link comes first', async () => {
    const user = userEvent.setup()
    await openSignedIn('/')
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()

    const sidebar = screen.getAllByRole('navigation', { name: 'Main' })[0]!
    const scrollTo = vi.spyOn(window, 'scrollTo')
    await user.click(within(sidebar).getByRole('link', { name: 'History' }))
    expect(screen.getByRole('main')).toHaveFocus()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  // Regression: StrictMode runs effects twice in development. A "first render" flag made the
  // page take focus on load, which scrolled the heading under the sticky topbar.
  it('does not scroll or take focus on first load, even under StrictMode', async () => {
    setToken('stored.jwt.token', false)
    mockApi(emptyApi)
    const scrollTo = vi.spyOn(window, 'scrollTo')
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(
      <StrictMode>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </StrictMode>,
    )
    await screen.findByRole('main')
    expect(scrollTo).not.toHaveBeenCalled()
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('does not steal focus when only the query string changes', async () => {
    const user = userEvent.setup()
    await openSignedIn('/alerts')
    const scrollTo = vi.spyOn(window, 'scrollTo')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active')
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('user block and log out', () => {
  it('shows the real name, initials and role label', async () => {
    await openSignedIn('/')
    expect(screen.getAllByText('Duty Operator').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Security operator').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveTextContent('DO')
    expect(initials('single')).toBe('S')
    expect(initials('')).toBe('?')
  })

  it('Log out goes to /logged-out and drops the token', async () => {
    const user = userEvent.setup()
    const router = await openSignedIn('/')
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'You have been logged out' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/logged-out')
    expect(getToken()).toBeNull()
  })
})

describe('search', () => {
  it('opens the Alerts list with the text as a query', async () => {
    const user = userEvent.setup()
    const router = await openSignedIn('/')
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Bag #31{Enter}')
    expect(router.state.location.pathname).toBe('/alerts')
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('Bag #31')
  })
})

describe('no invented numbers (D-06)', () => {
  it('shows no badge or dot while there is no data', async () => {
    await openSignedIn('/')
    expect(screen.queryByText(/Open alerts/)).toBeNull()
    expect(screen.queryByRole('img', { name: 'A run is active' })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Alerts' }).length).toBeGreaterThan(0)
  })

  it('shows the Alerts badge and bell dot once the count is above zero', async () => {
    vi.mocked(useShellStatus).mockReturnValue({ openAlerts: 3, hasLiveRun: true })
    await openSignedIn('/')
    expect(screen.getAllByText('Open alerts:')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Alerts, 3 open' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'A run is active' })).toBeTruthy()
  })
})
