import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import App from './App'

it('renders the foundation placeholder', () => {
  render(<App />)
  expect(screen.getByText(/foundation ready/i)).toBeTruthy()
})
