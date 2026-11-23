import { useEffect, type ReactNode } from 'react'

interface ToastProps {
  children: ReactNode
  onClose: () => void
}

/**
 * Prototype `.toast`: navy, bottom right, above the bottom tabs under 760 px. Render it inside an
 * `aria-live` region so screen readers announce it. Closes on its × button or Esc.
 */
export function Toast({ children, onClose }: ToastProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-x-4 bottom-[84px] z-20 flex items-start gap-3 rounded-xl bg-navy px-[18px] py-3.5 text-sm text-white shadow-lg tab:inset-x-auto tab:right-5 tab:bottom-5 tab:max-w-[380px]">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="-my-1 -mr-2 grid size-8 flex-none place-items-center rounded-lg font-bold text-white/80 hover:bg-white/10 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
