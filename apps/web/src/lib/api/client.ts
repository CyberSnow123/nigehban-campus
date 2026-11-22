/** The only place that talks to the API. Components never call `fetch` directly. */
import createClient, { type Middleware } from 'openapi-fetch'

import type { components, paths } from './schema'
import { clearToken, getToken } from './token'

export type ApiErrorBody = components['schemas']['ErrorBody']

/** Calls that must work without a token, and whose 401 means "wrong credentials". */
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password']

let unauthorizedHandler: () => void = () => {}

/** AuthProvider registers what happens when a logged-in request is rejected with 401. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

const isPublic = (url: string) => PUBLIC_PATHS.some((path) => new URL(url).pathname === path)

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getToken()
    if (token && !isPublic(request.url)) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ request, response }) {
    if (response.status === 401 && request.headers.has('Authorization')) {
      clearToken()
      unauthorizedHandler()
    }
    return response
  },
}

export const api = createClient<paths>({
  baseUrl: window.location.origin, // dev: the Vite proxy forwards /api to :8000
  fetch: (request) => globalThis.fetch(request), // looked up per call, so tests can stub it
})
api.use(authMiddleware)

/** The server's message for an error response, or a fallback (e.g. when the server is down). */
export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as Partial<ApiErrorBody> | undefined)?.error?.message
  return typeof message === 'string' && message ? message : fallback
}

export const NETWORK_ERROR = 'Cannot reach the server. Check your connection and try again.'
