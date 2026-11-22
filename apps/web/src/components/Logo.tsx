import { cx } from '../lib/cx'

/** Navy shield mark from the prototype. `large` is the logged-out page size. */
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <div
      className={cx(
        'grid flex-none place-items-center bg-navy',
        large ? 'size-20 rounded-[22px]' : 'size-11 rounded-xl',
      )}
      aria-hidden="true"
    >
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
