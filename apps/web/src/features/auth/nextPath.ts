/** Where to go after login: only an internal path is accepted (no open redirect). */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  if (/^\/(login|logged-out|forgot-password|reset-password)(\/|\?|$)/.test(next)) return '/'
  return next
}
