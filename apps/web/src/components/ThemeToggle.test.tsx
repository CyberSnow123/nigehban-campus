import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { currentTheme } from '../lib/theme'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })
  afterEach(() => localStorage.clear())

  it('switches the theme, labels the next action and remembers the choice', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('nigehban-theme')).toBe('dark')
    expect(currentTheme()).toBe('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('nigehban-theme')).toBe('light')
  })

  it('still switches when storage is blocked', async () => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      render(<ThemeToggle />)
      await act(async () => userEvent.click(screen.getByRole('button', { name: /dark/ })))
      expect(document.documentElement.dataset.theme).toBe('dark')
    } finally {
      Storage.prototype.setItem = setItem
    }
  })
})
