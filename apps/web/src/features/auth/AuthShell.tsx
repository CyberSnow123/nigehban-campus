import type { ComponentProps, ReactNode } from 'react'

/** Look shared by the auth pages (from the prototype's login and logged-out views). */

export const inputClass =
  'min-h-[50px] w-full rounded-xl border border-line bg-white px-4 text-base disabled:opacity-60'
export const primaryButtonClass =
  'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-navy bg-navy px-4 text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
export const linkClass = 'text-mute underline underline-offset-2 hover:text-ink'

export function Logo({ large = false }: { large?: boolean }) {
  const size = large ? 'size-20 rounded-[22px]' : 'size-11 rounded-xl'
  return (
    <div className={`grid flex-none place-items-center bg-navy ${size}`} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        className={large ? 'size-10' : 'size-[22px]'}
      >
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_30%,#eaf1ff,var(--bg)_60%)] p-6">
      <div className="w-full max-w-[520px]">
        {children}
        <p className="mt-6 text-center text-[13px] text-mute">
          &copy; 2026 Nigehban Campus AI Surveillance Suite
        </p>
      </div>
    </main>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line bg-card p-6 shadow-[0_1px_3px_#0f172a0a] sm:p-10">
      <div className="mb-7 flex items-center gap-3">
        <Logo />
        <div>
          <b className="block text-xl">Nigehban Campus</b>
          <small className="font-semibold tracking-[0.06em] text-mute">AI SURVEILLANCE SUITE</small>
        </div>
      </div>
      {children}
    </div>
  )
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.15] font-bold tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-mute">{subtitle}</p>}
    </>
  )
}

interface FieldProps extends ComponentProps<'input'> {
  label: string
  id: string
}

export function Field({ label, id, ...input }: FieldProps) {
  return (
    <div className="mt-[18px]">
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold tracking-wide">
        {label}
      </label>
      <input id={id} className={inputClass} {...input} />
    </div>
  )
}

/** Error line that screen readers announce when it appears. */
export function FormMessage({ children, tone }: { children?: ReactNode; tone: 'error' | 'ok' }) {
  const color = tone === 'error' ? 'text-danger' : 'text-ok'
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mt-2 min-h-[18px] font-semibold ${color}`}
    >
      {children}
    </p>
  )
}
