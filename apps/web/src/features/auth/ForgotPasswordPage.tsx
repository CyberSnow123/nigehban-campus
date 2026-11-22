import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { NETWORK_ERROR, api, errorMessage } from '../../lib/api/client'
import {
  AuthCard,
  AuthShell,
  Field,
  FormMessage,
  Heading,
  linkClass,
  primaryButtonClass,
} from './AuthShell'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    setError('')
    setPending(true)
    try {
      const { data, error: apiError } = await api.POST('/api/auth/forgot-password', {
        body: { email },
      })
      if (data) setSentMessage(data.message)
      else setError(errorMessage(apiError, 'Enter a valid email address.'))
    } catch {
      setError(NETWORK_ERROR)
    }
    setPending(false)
  }

  return (
    <AuthShell>
      <AuthCard>
        <Heading
          title="Forgot your password?"
          subtitle="Enter the email address on your account and we will send you a link to choose a new password."
        />
        {sentMessage ? (
          <div className="mt-6">
            <FormMessage tone="ok">{sentMessage}</FormMessage>
            <p className="mt-2 text-mute">
              The link works for 30 minutes. Check your spam folder if it does not arrive.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <Field
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <FormMessage tone="error">{error}</FormMessage>
            <button type="submit" className={`${primaryButtonClass} mt-4`} disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-6 border-t border-line pt-4 text-[13px]">
          <Link to="/login" className={linkClass}>
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  )
}
