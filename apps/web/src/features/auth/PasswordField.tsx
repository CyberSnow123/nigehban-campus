import { type ReactNode, useState } from 'react'

interface PasswordFieldProps {
  label: string
  id: string
  name: string
  autoComplete: 'current-password' | 'new-password'
  /** Shown on the right of the label row, e.g. a "Forgot password?" link. */
  labelExtra?: ReactNode
  minLength?: number
}

export function PasswordField({
  label,
  id,
  name,
  autoComplete,
  labelExtra,
  minLength,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="mt-[18px]">
      <div className="mb-2 flex justify-between text-[13px] font-semibold tracking-wide">
        <label htmlFor={id}>{label}</label>
        {labelExtra}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="min-h-[50px] w-full rounded-xl border border-line bg-white px-4 pr-20 text-base"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          className="absolute top-1 right-1 min-h-11 rounded-lg px-3 text-[13px] font-semibold text-mute hover:text-ink"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}
