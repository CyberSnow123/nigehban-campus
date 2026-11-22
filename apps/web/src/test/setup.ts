import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library's automatic cleanup does not register itself.
afterEach(cleanup)

// jsdom has no modal <dialog> support. This minimal stand-in only mirrors the open state and the
// `close` event. Focus trapping and Esc are the browser's job and are checked in a real browser.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom does not implement scrolling.
window.scrollTo = () => undefined
