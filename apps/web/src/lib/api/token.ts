/**
 * Where the access token lives. It is always kept in memory; "remember" also persists it in
 * localStorage (survives closing the browser), otherwise sessionStorage (gone with the tab).
 * Storage can be blocked, so every access is guarded.
 */
const KEY = 'nigehban.token'

let memoryToken: string | null = null

function readFrom(storage: () => Storage): string | null {
  try {
    return storage().getItem(KEY)
  } catch {
    return null
  }
}

function removeFromBoth(): void {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      storage().removeItem(KEY)
    } catch {
      /* storage unavailable: nothing to remove */
    }
  }
}

export function getToken(): string | null {
  memoryToken ??= readFrom(() => localStorage) ?? readFrom(() => sessionStorage)
  return memoryToken
}

export function setToken(token: string, remember: boolean): void {
  memoryToken = token
  removeFromBoth()
  try {
    ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
  } catch {
    /* kept in memory only */
  }
}

export function clearToken(): void {
  memoryToken = null
  removeFromBoth()
}
