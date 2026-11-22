import { createContext, useContext } from 'react'

import type { components } from '../../lib/api/schema'

export type AuthUser = components['schemas']['UserMe']

export interface AuthState {
  user: AuthUser | null
  /** `loading` only while a stored token is being checked with the server. */
  status: 'loading' | 'authenticated' | 'anonymous'
  /** Rejects with a user-readable message. */
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>')
  return state
}
