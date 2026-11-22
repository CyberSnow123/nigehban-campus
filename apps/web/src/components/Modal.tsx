import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Buttons row at the bottom. */
  footer?: ReactNode
}

/**
 * Dialog built on the native `<dialog>` element: it traps focus, closes on Esc, keeps the page
 * behind it inert and returns focus to the button that opened it.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,480px)] rounded-xl border border-line bg-card p-0 text-ink backdrop:bg-navy/40"
    >
      <div className="border-b border-line px-5 py-3.5">
        <h2 id="modal-title" className="m-0 text-base font-semibold">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">{footer}</div>
      )}
    </dialog>
  )
}
