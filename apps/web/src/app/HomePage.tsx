import { useNavigate } from 'react-router-dom'

import { useAuth } from '../features/auth/useAuth'

/** Placeholder inside the protected area. Phase 5 replaces it with the real shell + dashboard. */
export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // The logged-out page ends the session when it opens (see LoggedOutPage).
  function onLogout() {
    navigate('/logged-out', { replace: true, state: { at: Date.now() } })
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Nigehban Campus</h1>
      <p className="mt-2 text-mute">
        Signed in as <b className="text-ink">{user?.display_name}</b> ({user?.role}). The dashboard
        arrives in a later phase.
      </p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-6 min-h-11 rounded-xl border border-line bg-white px-4 font-semibold hover:border-slate-300"
      >
        Log out
      </button>
    </main>
  )
}
