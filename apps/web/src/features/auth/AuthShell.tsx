import type { ComponentProps, ReactNode } from 'react'

import { buttonClass } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'
import { cx } from '../../lib/cx'

/** Look shared by the auth pages (from the prototype's login and logged-out views). */

export const inputClass =
  'min-h-[50px] w-full rounded-lg border border-line bg-card px-4 text-base disabled:opacity-60'
export const primaryButtonClass = buttonClass({ variant: 'dark', size: 'lg', wide: true })
export const linkClass = 'text-mute underline underline-offset-2 hover:text-ink'

/** Centred page on the prototype's pale blue glow. `wide` fits the two-panel login card. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_30%,var(--color-glow),var(--bg)_60%)] p-6">
      <ThemeToggle className="fixed top-3 right-3" />
      <div className={cx('w-full', wide ? 'max-w-[1080px]' : 'max-w-[520px]')}>
        {children}
        <p className="mt-6 text-center text-[13px] text-mute">
          &copy; 2026 Nigehban Campus AI Surveillance Suite
        </p>
      </div>
    </main>
  )
}

/** Logo and product name at the top of an auth card. */
export function BrandHeader() {
  return (
    <div className="mb-7 flex items-center gap-3">
      <Logo />
      <div>
        <b className="block text-xl font-semibold">Nigehban Campus</b>
        <small className="font-semibold tracking-[0.06em] text-mute">AI SURVEILLANCE SUITE</small>
      </div>
    </div>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 sm:p-10">
      <BrandHeader />
      {children}
    </div>
  )
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 className="m-0 text-[clamp(26px,3vw,32px)] leading-tight font-semibold tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-mute">{subtitle}</p>}
    </>
  )
}

interface FieldProps extends ComponentProps<'input'> {
  label: string
  id: string
  /** Icon inside the left edge of the input (prototype `.inp`). */
  icon?: ReactNode
}

export function Field({ label, id, icon, ...input }: FieldProps) {
  return (
    <div className="mt-[18px]">
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold tracking-wide">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-[15px] left-3.5 text-mute">{icon}</span>
        )}
        <input id={id} className={cx(inputClass, icon ? 'pl-11' : false)} {...input} />
      </div>
    </div>
  )
}

/** Error line that screen readers announce when it appears. */
export function FormMessage({ children, tone }: { children?: ReactNode; tone: 'error' | 'ok' }) {
  const color = tone === 'error' ? 'text-red' : 'text-grn'
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mt-2 min-h-[18px] font-semibold ${color}`}
    >
      {children}
    </p>
  )
}
