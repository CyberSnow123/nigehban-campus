import { useEffect } from 'react'

/** Sets the browser tab title ("Alerts · Nigehban Campus"), which screen readers announce. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Nigehban Campus`
  }, [title])
}
