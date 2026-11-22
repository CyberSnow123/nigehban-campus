import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Providers } from '../../app/providers'
import { api } from '../../lib/api/client'
import { getToken, setToken } from '../../lib/api/token'
import {
  OPERATOR,
  apiError,
  loginOk,
  mockApi,
  renderApp,
  reply,
  resetAuthState,
} from '../../test/helpers'
import { RequireAdmin, RequireAuth } from './RequireAuth'

beforeEach(resetAuthState)
afterEach(resetAuthState)

async function logIn(user = userEvent.setup()) {
  await user.type(screen.getByLabelText('Username'), 'operator')
  await user.type(screen.getByLabelText('Password'), 'correct-horse-battery')
  return user
}

describe('RequireAuth', () => {
  it('redirects an anonymous visitor to /login and remembers where they were going', async () => {
    mockApi(() => reply(500, {}))
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?next=%2F')
  })

  it('shows the protected page once the stored token is accepted', async () => {
    setToken('stored.jwt.token', true)
    const calls = mockApi(() => reply(200, OPERATOR))
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      path: '/api/auth/me',
      authorization: 'Bearer stored.jwt.token',
    })
  })

  it('drops a stored token the server rejects and goes to /login', async () => {
    setToken('old.expired.token', true)
    mockApi(() => apiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'))
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/login')
    expect(getToken()).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})

describe('login', () => {
  it('logs in, stores the token for later and opens the app', async () => {
    const calls = mockApi((call) =>
      call.path === '/api/auth/login' ? loginOk() : reply(200, OPERATOR),
    )
    renderApp('/login')
    const user = await logIn()
    await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'operator', password: 'correct-horse-battery' },
    })
    expect(localStorage.getItem('nigehban.token')).toBe('jwt.token.value') // "remember" is on
  })

  it('uses sessionStorage when "Remember this terminal session" is unticked', async () => {
    mockApi(() => loginOk())
    renderApp('/login')
    const user = await logIn()
    await user.click(screen.getByLabelText('Remember this terminal session'))
    await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))

    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(sessionStorage.getItem('nigehban.token')).toBe('jwt.token.value')
    expect(localStorage.getItem('nigehban.token')).toBeNull()
  })

  it('goes back to the page that was asked for', async () => {
    mockApi(() => loginOk())
    const router = renderApp('/login?next=%2F')
    await userEventLogin()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows the server message for a wrong password and stores nothing', async () => {
    mockApi(() => apiError(401, 'UNAUTHORIZED', 'Invalid username or password.'))
    renderApp('/login')
    const user = await logIn()
    await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Invalid username or password.')
    expect(getToken()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
  })

  it('shows the wait message on 429 and lets the user try again afterwards', async () => {
    let blocked = true
    mockApi(() =>
      blocked
        ? apiError(
            429,
            'RATE_LIMITED',
            'Too many attempts. Please wait up to 60 seconds and try again.',
          )
        : loginOk(),
    )
    renderApp('/login')
    const user = await logIn()
    const submit = screen.getByRole('button', { name: 'Log in to monitoring' })
    await user.click(submit)

    expect((await screen.findByRole('alert')).textContent).toMatch(/too many attempts.*60 seconds/i)
    expect(getToken()).toBeNull()
    expect((submit as HTMLButtonElement).disabled).toBe(false) // not stuck on "Logging in…"

    blocked = false
    await user.click(submit)
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
  })

  it('says so when the server cannot be reached', async () => {
    mockApi(() => {
      throw new TypeError('network down')
    })
    renderApp('/login')
    const user = await logIn()
    await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/cannot reach the server/i)
  })

  it('does not send a stale token with the login request', async () => {
    setToken('stale.token.value', false)
    const calls = mockApi((call) => {
      if (call.path === '/api/auth/me') return apiError(401, 'UNAUTHORIZED', 'x')
      return loginOk()
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Operator sign in' })
    const user = await logIn()
    await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(calls.find((c) => c.path === '/api/auth/login')?.authorization).toBeNull()
  })

  it('can show and hide the password', async () => {
    renderApp('/login')
    const user = userEvent.setup()
    const input = await screen.findByLabelText('Password')
    expect(input.getAttribute('type')).toBe('password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.getAttribute('type')).toBe('text')
  })

  it('links to the forgot-password page', async () => {
    renderApp('/login')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Forgot password?' }))
    expect(await screen.findByRole('heading', { name: 'Forgot your password?' })).toBeTruthy()
  })
})

async function userEventLogin() {
  const user = await logIn()
  await user.click(screen.getByRole('button', { name: 'Log in to monitoring' }))
}

describe('logout and expiry', () => {
  async function openApp() {
    mockApi((call) => (call.path === '/api/auth/login' ? loginOk() : reply(200, OPERATOR)))
    const router = renderApp('/login')
    await userEventLogin()
    await screen.findByRole('heading', { name: 'Dashboard' })
    return router
  }

  it('log out clears the token and shows the logged-out page', async () => {
    const router = await openApp()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'You have been logged out' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/logged-out')
    expect(getToken()).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('cannot go back into the app after logging out', async () => {
    const router = await openApp()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))
    await screen.findByRole('heading', { name: 'You have been logged out' })

    await act(() => router.navigate('/'))
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
  })

  it('"Log in again" returns to the login page', async () => {
    renderApp('/logged-out')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Log in again' }))
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
  })

  it('a 401 on any later request ends the session and redirects to /login', async () => {
    mockApi((call) => (call.path === '/api/auth/login' ? loginOk() : reply(200, OPERATOR)))
    const router = renderApp('/login')
    await userEventLogin()
    await screen.findByRole('heading', { name: 'Dashboard' })

    mockApi(() => apiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'))
    await act(async () => {
      await api.GET('/api/auth/me')
    })

    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
    expect(router.state.location.search).toBe('?next=%2F')
    expect(getToken()).toBeNull()
  })
})

describe('RequireAdmin', () => {
  function renderAdminArea(role: 'operator' | 'admin') {
    setToken('t.t.t', false)
    mockApi(() => reply(200, { ...OPERATOR, role }))
    const router = createMemoryRouter(
      [
        {
          element: <RequireAuth />,
          children: [
            { element: <RequireAdmin />, children: [{ path: '/', element: <p>Admin tools</p> }] },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
  }

  it('shows admin pages to admins', async () => {
    renderAdminArea('admin')
    expect(await screen.findByText('Admin tools')).toBeTruthy()
  })

  it('tells operators it is for administrators only', async () => {
    renderAdminArea('operator')
    expect((await screen.findByRole('alert')).textContent).toMatch(/only administrators/i)
    expect(screen.queryByText('Admin tools')).toBeNull()
  })
})
