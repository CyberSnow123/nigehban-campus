/** List filters kept in the address, so a filtered list can be reloaded and shared. */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The value if it is allowed, else the first allowed value (the default). */
export function pick<T extends string>(allowed: readonly T[], raw: string | null): T {
  return allowed.find((value) => value === raw) ?? allowed[0]!
}

export function pageNumber(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/**
 * `update(key, value)` writes one filter into the address. An empty value, `all` or the key's
 * default removes it, so addresses stay short. Changing any filter except `page` goes back to
 * page 1. History is replaced, not pushed, so Back leaves the page instead of undoing a filter.
 */
export function useFilterUpdater<K extends string>(defaults: Partial<Record<K | 'page', string>>) {
  const [params, setParams] = useSearchParams()
  const defaultsKey = JSON.stringify(defaults)
  const update = useCallback(
    (key: K | 'page', value: string) => {
      const fallback = (JSON.parse(defaultsKey) as Record<string, string>)[key] ?? ''
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (key !== 'page') next.delete('page')
          if (value === '' || value === 'all' || value === fallback) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams, defaultsKey],
  )
  return { params, update }
}
