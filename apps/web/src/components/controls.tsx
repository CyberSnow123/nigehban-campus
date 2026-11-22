import type { ComponentProps, ReactNode } from 'react'

import { cx } from '../lib/cx'

interface SegmentedProps<T extends string> {
  label: string
  options: ReadonlyArray<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
}

/** Prototype `.seg`: a small group of mutually exclusive buttons. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-lg border border-line bg-card p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            'min-h-9 rounded-md px-3.5 font-medium',
            option.value === value ? 'bg-navy text-white' : 'text-slate-ink hover:bg-soft',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Native select in the prototype's look. `label` is its accessible name. */
export function SelectField({
  label,
  className,
  ...rest
}: { label: string } & ComponentProps<'select'>) {
  return (
    <select
      aria-label={label}
      className={cx(
        'min-h-11 rounded-lg border border-line bg-card px-3 font-medium disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  )
}

interface ToggleProps extends Omit<ComponentProps<'input'>, 'type' | 'role'> {
  /** Accessible name of the switch. */
  label: string
}

/** Prototype `.tog` switch. Built on a real checkbox so the keyboard and screen readers work. */
export function Toggle({ label, className, ...rest }: ToggleProps) {
  return (
    <label className={cx('relative inline-block h-[26px] w-[46px] flex-none', className)}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-navy peer-disabled:opacity-50',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blu',
          'after:absolute after:top-[3px] after:left-[3px] after:size-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:left-[23px]',
        )}
      />
    </label>
  )
}

interface RangeFieldProps extends Omit<ComponentProps<'input'>, 'type'> {
  id: string
  label: string
  /** Text next to the label, e.g. "2.5 body-heights (~425 cm)". Dash when there is no value. */
  output?: string
}

/** Labelled slider (prototype `.field`). */
export function RangeField({ id, label, output, className, ...rest }: RangeFieldProps) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex justify-between gap-2.5 text-sm font-medium">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="font-mono text-[13px] whitespace-nowrap text-blu">
          {output ?? '—'}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={cx('min-h-8 w-full accent-navy', className)}
        {...rest}
      />
    </div>
  )
}

/** Row with a label on the left and a switch on the right (prototype `.sw`). */
export function SwitchRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-b-0">
      {children}
    </div>
  )
}
