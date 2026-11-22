import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { cx } from '../lib/cx'

export type ButtonVariant = 'default' | 'dark' | 'red' | 'pur' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  default: 'border-line bg-card hover:border-line-strong',
  dark: 'border-navy bg-navy text-white hover:opacity-90',
  red: 'border-red bg-red text-on-solid hover:opacity-90',
  pur: 'border-pur bg-pur text-on-solid hover:opacity-90',
  soft: 'border-soft bg-soft hover:border-line-strong',
}
// 44 px touch targets; the compact size drops to 40 px on desktop only.
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-11 tab:min-h-10 text-sm',
  md: 'min-h-11',
  lg: 'min-h-[52px] text-base',
}

interface LookProps {
  variant?: ButtonVariant
  size?: ButtonSize
  wide?: boolean
}

export function buttonClass({ variant = 'default', size = 'md', wide }: LookProps): string {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg border px-4 font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    wide && 'w-full',
  )
}

export function Button({
  variant,
  size,
  wide,
  className,
  type = 'button',
  ...rest
}: LookProps & ComponentProps<'button'>) {
  return (
    <button type={type} className={cx(buttonClass({ variant, size, wide }), className)} {...rest} />
  )
}

/** Same look as `Button`, but a real link. */
export function LinkButton({
  variant,
  size,
  wide,
  className,
  ...rest
}: LookProps & Omit<LinkProps, 'className'> & { className?: string }) {
  return <Link className={cx(buttonClass({ variant, size, wide }), className)} {...rest} />
}

/** Square icon-only button. `label` is required so it has an accessible name. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: { label: string } & Omit<ComponentProps<'button'>, 'aria-label'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid size-11 flex-none place-items-center rounded-lg text-mute hover:bg-soft hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
