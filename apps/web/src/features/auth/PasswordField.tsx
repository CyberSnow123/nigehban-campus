import { type ReactNode, useState } from 'react'

import { EyeIcon, EyeOffIcon, LockIcon } from '../../components/icons'
import { inputClass } from './AuthShell'

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
        <LockIcon className="pointer-events-none absolute top-[15px] left-3.5 size-5 text-mute" />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className={`${inputClass} pr-14 pl-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          className="absolute top-[3px] right-1 grid size-11 place-items-center rounded-lg text-mute hover:bg-soft hover:text-ink"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
    </div>
  )
}
