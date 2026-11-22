import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { NETWORK_ERROR, api, errorMessage } from '../../lib/api/client'
import {
  AuthCard,
  AuthShell,
  FormMessage,
  Heading,
  linkClass,
  primaryButtonClass,
} from './AuthShell'
import { PasswordField } from './PasswordField'

const MIN_LENGTH = 8

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  // Kept in state so it can be removed from the address bar (history, screenshots, referrers).
  const [token] = useState(() => params.get('token') ?? '')
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password.length < MIN_LENGTH) {
      return setError(`Use at least ${MIN_LENGTH} characters.`)
    }
    if (password !== String(form.get('confirm') ?? '')) {
      return setError('The two passwords do not match.')
    }
    setError('')
    setPending(true)
    try {
      const { data, error: apiError } = await api.POST('/api/auth/reset-password', {
        body: { token, new_password: password },
      })
      if (data) setDoneMessage(data.message)
      else setError(errorMessage(apiError, 'Could not change the password.'))
    } catch {
      setError(NETWORK_ERROR)
    }
    setPending(false)
  }

  const requestNewLink = (
    <Link to="/forgot-password" className={linkClass}>
      Request a new link
    </Link>
  )

  return (
    <AuthShell>
      <AuthCard>
        <Heading title="Choose a new password" />
        {doneMessage ? (
          <div className="mt-6">
            <FormMessage tone="ok">{doneMessage}</FormMessage>
            <Link to="/login" className={`${primaryButtonClass} mt-4`}>
              Go to sign in
            </Link>
          </div>
        ) : !token ? (
          <p role="alert" className="mt-4 text-danger">
            This reset link is incomplete. {requestNewLink}.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <PasswordField
              label="New password"
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={MIN_LENGTH}
            />
            <PasswordField
              label="Confirm new password"
              id="confirm"
              name="confirm"
              autoComplete="new-password"
            />
            <FormMessage tone="error">{error}</FormMessage>
            {error.includes('link') && <p className="text-[13px]">{requestNewLink}</p>}
            <button type="submit" className={`${primaryButtonClass} mt-4`} disabled={pending}>
              {pending ? 'Saving…' : 'Change password'}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  )
}
