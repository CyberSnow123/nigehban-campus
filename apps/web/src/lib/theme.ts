import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'nigehban-theme'
const listeners = new Set<() => void>()

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null // storage blocked
  }
}

/** The user's choice, else the OS setting. index.html runs the same rule before first paint. */
export function currentTheme(): Theme {
  return (
    stored() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  listeners.forEach((notify) => notify())
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // The choice still applies for this visit.
  }
  apply(theme)
}

const subscribe = (notify: () => void) => {
  listeners.add(notify)
  return () => void listeners.delete(notify)
}
const snapshot = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'light' as Theme)
  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme])
  return { theme, toggle }
}
