import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearToken, getToken, setToken } from './token'
import { safeNextPath } from '../../features/auth/nextPath'

afterEach(() => {
  clearToken()
  vi.restoreAllMocks()
})

describe('token storage', () => {
  it('remember = true persists in localStorage only', () => {
    setToken('abc', true)
    expect(localStorage.getItem('nigehban.token')).toBe('abc')
    expect(sessionStorage.getItem('nigehban.token')).toBeNull()
    expect(getToken()).toBe('abc')
  })

  it('remember = false persists in sessionStorage only', () => {
    setToken('abc', false)
    expect(sessionStorage.getItem('nigehban.token')).toBe('abc')
    expect(localStorage.getItem('nigehban.token')).toBeNull()
  })

  it('switching mode moves the token instead of leaving a copy behind', () => {
    setToken('abc', true)
    setToken('def', false)
    expect(localStorage.getItem('nigehban.token')).toBeNull()
    expect(getToken()).toBe('def')
  })

  it('clearToken empties memory and both storages', () => {
    setToken('abc', true)
    clearToken()
    expect(getToken()).toBeNull()
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })

  it('reads a token saved earlier (page reload)', () => {
    localStorage.setItem('nigehban.token', 'saved')
    expect(getToken()).toBe('saved')
  })

  it('still works in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    setToken('abc', true)
    expect(getToken()).toBe('abc')
  })
})

describe('safeNextPath', () => {
  it.each([
    ['/', '/'],
    ['/alerts?status=active', '/alerts?status=active'],
    ['/alerts/alt_01JD2X0000000000000000000A', '/alerts/alt_01JD2X0000000000000000000A'],
  ])('keeps the internal path %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'alerts',
    '/login',
    '/login?next=/',
    '/logged-out',
    '/reset-password?token=x',
  ])('falls back to / for %s', (input) => {
    expect(safeNextPath(input)).toBe('/')
  })
})
