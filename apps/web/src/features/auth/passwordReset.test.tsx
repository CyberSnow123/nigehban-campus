import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { apiError, mockApi, renderApp, reply, resetAuthState } from '../../test/helpers'

beforeEach(resetAuthState)
afterEach(resetAuthState)

const NEUTRAL = 'If that email is registered, a reset link has been sent.'

describe('forgot password', () => {
  it('sends the email and shows the neutral message from the server', async () => {
    const calls = mockApi(() => reply(202, { message: NEUTRAL }))
    renderApp('/forgot-password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'operator@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect((await screen.findByRole('status')).textContent).toBe(NEUTRAL)
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: 'operator@example.com' },
      authorization: null,
    })
    expect(screen.queryByLabelText('Email address')).toBeNull() // form is replaced by the message
  })

  it('shows the server message for an invalid address', async () => {
    mockApi(() => apiError(422, 'VALIDATION_ERROR', 'email: String should match pattern'))
    renderApp('/forgot-password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/email:/)
  })

  it('says so when the server cannot be reached', async () => {
    mockApi(() => {
      throw new TypeError('offline')
    })
    renderApp('/forgot-password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'a@b.co')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/cannot reach the server/i)
  })

  it('has a way back to sign in', async () => {
    renderApp('/forgot-password')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Back to sign in' }))
    expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
  })
})

describe('reset password', () => {
  const TOKEN = 'T0kenFromTheEmailLink_abcdefghijklmnop'

  async function fill(password: string, confirm: string) {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('New password'), password)
    await user.type(screen.getByLabelText('Confirm new password'), confirm)
    await user.click(screen.getByRole('button', { name: 'Change password' }))
  }

  it('submits the token from the link with the new password, then offers sign in', async () => {
    const calls = mockApi(() => reply(200, { message: 'Your password has been changed.' }))
    renderApp(`/reset-password?token=${TOKEN}`)
    await fill('a-brand-new-passphrase', 'a-brand-new-passphrase')

    expect((await screen.findByRole('status')).textContent).toMatch(/password has been changed/)
    expect(calls[0]).toMatchObject({
      path: '/api/auth/reset-password',
      body: { token: TOKEN, new_password: 'a-brand-new-passphrase' },
    })
    expect(screen.getByRole('link', { name: 'Go to sign in' }).getAttribute('href')).toBe('/login')
  })

  it('removes the token from the address bar', async () => {
    window.history.pushState({}, '', `/reset-password?token=${TOKEN}`)
    mockApi(() => reply(200, {}))
    renderApp(`/reset-password?token=${TOKEN}`)
    await screen.findByLabelText('New password')
    expect(window.location.search).toBe('')
    window.history.pushState({}, '', '/')
  })

  it('checks length and confirmation before calling the server', async () => {
    const calls = mockApi(() => reply(200, {}))
    renderApp(`/reset-password?token=${TOKEN}`)
    await fill('short', 'short')
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 8 characters/)

    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('New password'), 'long-enough-one')
    await user.type(screen.getByLabelText('Confirm new password'), 'long-enough-two')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/do not match/)
    expect(calls).toHaveLength(0)
  })

  it('shows the server message for a used or expired link and offers a new one', async () => {
    mockApi(() => apiError(422, 'VALIDATION_ERROR', 'This reset link is invalid or has expired.'))
    renderApp(`/reset-password?token=${TOKEN}`)
    await fill('a-brand-new-passphrase', 'a-brand-new-passphrase')

    expect((await screen.findByRole('alert')).textContent).toMatch(/invalid or has expired/)
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeTruthy()
  })

  it('explains an incomplete link', async () => {
    renderApp('/reset-password')
    expect((await screen.findByRole('alert')).textContent).toMatch(/incomplete/)
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeTruthy()
    expect(screen.queryByLabelText('New password')).toBeNull()
  })
})
