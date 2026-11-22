import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { resetAuthState } from '../test/helpers'
import App from './App'

beforeEach(resetAuthState)
afterEach(resetAuthState)

it('opens on the sign-in page when nobody is logged in', async () => {
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Operator sign in' })).toBeTruthy()
})
