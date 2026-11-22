import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Returns a function that goes to `/logged-out`. Opening that page ends the session (see
 * LoggedOutPage), so every Log out button only has to navigate.
 */
export function useLogoutNavigate(): () => void {
  const navigate = useNavigate()
  return useCallback(
    () => navigate('/logged-out', { replace: true, state: { at: Date.now() } }),
    [navigate],
  )
}
