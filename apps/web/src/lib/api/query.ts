/** Shared pieces for React Query hooks that call the API (Frontend.md §4). */
import { errorMessage, NETWORK_ERROR } from './client'

/** Live screens (stats, open alerts, alert detail) refresh this often (D-09). */
export const POLL_MS = 3000
/** Past alerts (History, Person) change rarely. */
export const SLOW_POLL_MS = 15000

/** A failed API call, with the server's message and HTTP status (0 = no response). */
export class ApiFailure extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface Result<T> {
  data?: T
  error?: unknown
  response: Response
}

/** The data of an openapi-fetch call, or an `ApiFailure` with the server's message. */
export async function unwrap<T>(call: Promise<Result<T>>, fallback: string): Promise<T> {
  let result: Result<T>
  try {
    result = await call
  } catch {
    throw new ApiFailure(NETWORK_ERROR, 0)
  }
  if (result.error !== undefined || result.data === undefined) {
    throw new ApiFailure(errorMessage(result.error, fallback), result.response.status)
  }
  return result.data
}

/** A client error (4xx) will not change on retry; a server or network error is retried once. */
export function retryOnce(count: number, error: Error): boolean {
  const status = error instanceof ApiFailure ? error.status : 0
  return !(status >= 400 && status < 500) && count < 1
}
