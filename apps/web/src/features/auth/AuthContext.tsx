import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { NETWORK_ERROR, api, errorMessage, setUnauthorizedHandler } from '../../lib/api/client'
import { clearToken, getToken, setToken } from '../../lib/api/token'
import { AuthContext, type AuthState, type AuthUser } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthState['status']>(() =>
    getToken() ? 'loading' : 'anonymous',
  )

  const dropSession = useCallback(() => {
    clearToken()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Any 401 on a logged-in request ends the session; RequireAuth then redirects to /login.
  useEffect(() => setUnauthorizedHandler(dropSession), [dropSession])

  // A token found in storage is only trusted once the server accepts it.
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api
      .GET('/api/auth/me')
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setUser(data)
          setStatus('authenticated')
        } else {
          dropSession()
        }
      })
      .catch(() => !cancelled && dropSession())
    return () => {
      cancelled = true
    }
  }, [dropSession])

  const login = useCallback<AuthState['login']>(async (username, password, remember) => {
    let result
    try {
      result = await api.POST('/api/auth/login', { body: { username, password } })
    } catch {
      throw new Error(NETWORK_ERROR)
    }
    if (!result.data) throw new Error(errorMessage(result.error, 'Could not log in.'))
    setToken(result.data.access_token, remember)
    setUser(result.data.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    dropSession()
  }, [dropSession])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
