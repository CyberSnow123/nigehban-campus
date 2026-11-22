import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { AuthShell, Logo, primaryButtonClass } from './AuthShell'
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
      <div className="rounded-[18px] border border-line border-t-4 border-t-emerald-500 bg-card px-8 py-10 text-center shadow-[0_1px_3px_#0f172a0a]">
        <div className="mx-auto mb-[18px] w-fit">
          <Logo large />
        </div>
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.15] font-bold tracking-tight">
          You have been logged out
        </h1>
        <p className="mt-1.5 text-mute">
          Your session ended at <b className="font-mono">{loggedOutAt}</b>. Live monitoring
          continues in the background.
        </p>
        <p className="my-5 inline-block rounded-full bg-ok-bg px-3 py-1 text-[13px] font-semibold text-ok">
          Active feeds and automatic alerts keep running
        </p>
        <Link to="/login" className={primaryButtonClass}>
          Log in again
        </Link>
      </div>
    </AuthShell>
  )
}
