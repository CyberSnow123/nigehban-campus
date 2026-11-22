import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { LinkButton } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { Pill } from '../../components/Pill'
import { AuthShell } from './AuthShell'
import { useAuth } from './useAuth'

const timeFormat = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export default function LoggedOutPage() {
  const location = useLocation()
  const { logout } = useAuth()
  // Opening this public page is what ends the session. Doing it here (not in the button that
  // navigates here) avoids RequireAuth redirecting to /login while the navigation is in flight.
  useEffect(() => logout(), [logout])
  const [loggedOutAt] = useState(() => {
    const at = (location.state as { at?: number } | null)?.at
    return timeFormat.format(at ?? Date.now())
  })

  return (
    <AuthShell>
      <div className="rounded-xl border border-line border-t-4 border-t-live bg-card px-8 py-10 text-center">
        <div className="mx-auto mb-[18px] w-fit">
          <Logo large />
        </div>
        <h1 className="m-0 text-[clamp(26px,3vw,32px)] leading-tight font-semibold tracking-tight">
          You have been logged out
        </h1>
        <p className="mt-1.5 text-mute">
          Your session ended at <b className="font-mono">{loggedOutAt}</b>. Live monitoring
          continues in the background.
        </p>
        <p className="my-5">
          <Pill tone="grn">Active feeds and automatic alerts keep running</Pill>
        </p>
        <LinkButton to="/login" variant="dark" size="lg" wide>
          Log in again
        </LinkButton>
      </div>
    </AuthShell>
  )
}
