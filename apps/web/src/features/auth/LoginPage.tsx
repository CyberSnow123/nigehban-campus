import { type FormEvent, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { Button } from '../../components/Button'
import { ArrowRightIcon, UserIcon } from '../../components/icons'
import { AuthShell, BrandHeader, Field, FormMessage, Heading, linkClass } from './AuthShell'
import { LoginArt } from './LoginArt'
import { PasswordField } from './PasswordField'
import { safeNextPath } from './nextPath'
import { useAuth } from './useAuth'

export default function LoginPage() {
  const { login, status } = useAuth()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (status === 'authenticated') return <Navigate to={next} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setPending(true)
    try {
      await login(
        String(form.get('username') ?? ''),
        String(form.get('password') ?? ''),
        form.get('remember') === 'on',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.')
      setPending(false)
    }
  }

  return (
    <AuthShell wide>
      <div className="grid overflow-hidden rounded-xl border border-line bg-card tab:grid-cols-2">
        <LoginArt />
        <form onSubmit={onSubmit} noValidate className="p-6 sm:p-10 tab:p-14">
          <BrandHeader />
          <Heading
            title="Operator sign in"
            subtitle="Use your institutional account to open live campus monitoring."
          />
          <Field
            label="Username"
            id="username"
            name="username"
            icon={<UserIcon className="size-5" />}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          <PasswordField
            label="Password"
            id="password"
            name="password"
            autoComplete="current-password"
            labelExtra={
              <Link to="/forgot-password" className={`${linkClass} font-normal`}>
                Forgot password?
              </Link>
            }
          />
          <FormMessage tone="error">{error}</FormMessage>
          <label className="my-4 flex items-center gap-2.5">
            <input type="checkbox" name="remember" defaultChecked className="size-5 accent-navy" />
            Remember this terminal session
          </label>
          <Button type="submit" variant="dark" size="lg" wide disabled={pending}>
            {pending ? 'Logging in…' : 'Log in to monitoring'}
            {!pending && <ArrowRightIcon className="size-4" />}
          </Button>
          <p className="mt-6 mb-0 border-t border-line pt-4 text-[13px] text-mute">
            Authorised campus security personnel only.
          </p>
        </form>
      </div>
    </AuthShell>
  )
}
