import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { Providers } from '../app/providers'
import { routes } from '../app/router'
import { clearToken } from '../lib/api/token'

export interface RecordedCall {
  method: string
  path: string
  /** Query parameters of the request. */
  query: URLSearchParams
  body: unknown
  authorization: string | null
}
export interface MockReply {
  status: number
  json: unknown
}
type Handler = (call: RecordedCall) => MockReply | Promise<MockReply>

/** Replaces `fetch` for one test. Returns the list of requests the app made. */
export function mockApi(handler: Handler): RecordedCall[] {
  const calls: RecordedCall[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const body =
        request.method === 'GET'
          ? null
          : await request
              .clone()
              .json()
              .catch(() => null)
      const call = {
        method: request.method,
        path: new URL(request.url).pathname,
        query: new URL(request.url).searchParams,
        body,
        authorization: request.headers.get('Authorization'),
      }
      calls.push(call)
      const reply = await handler(call)
      return new Response(JSON.stringify(reply.json), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  return calls
}

export const reply = (status: number, json: unknown): MockReply => ({ status, json })
export const apiError = (status: number, code: string, message: string): MockReply =>
  reply(status, { error: { code, message } })

export const OPERATOR = {
  id: 'usr_01JD2X0000000000000000000A',
  username: 'operator',
  display_name: 'Duty Operator',
  role: 'operator',
} as const

export const EMPTY_STATS = {
  open_total: 0,
  active: 0,
  acknowledged: 0,
  today_abandoned: 0,
  today_theft: 0,
  closed_today: 0,
  running_runs: 0,
  latest_alert: null,
}

/**
 * The signed-in shell polls `/api/stats`, and the pages load lists. This answers those with
 * empty data, and anything else with the logged-in user.
 */
export function emptyApi(call: RecordedCall): MockReply {
  if (call.path === '/api/stats') return reply(200, EMPTY_STATS)
  if (call.path === '/api/stats/history') {
    return reply(200, { total: 0, false_alarms: 0, avg_response_s: null })
  }
  if (call.path === '/api/alerts')
    return reply(200, { items: [], total: 0, page: 1, page_size: 20 })
  return reply(200, OPERATOR)
}

export const loginOk = (user: object = OPERATOR): MockReply =>
  reply(200, {
    access_token: 'jwt.token.value',
    token_type: 'bearer',
    expires_at: '2026-11-23T08:00:00Z',
    user,
  })

export function resetAuthState(): void {
  clearToken()
  localStorage.clear()
  sessionStorage.clear()
  vi.unstubAllGlobals()
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}
