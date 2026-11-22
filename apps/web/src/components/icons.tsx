import type { ReactNode } from 'react'

/** Icon paths copied from the prototype. Decorative: hidden from screen readers. */
function icon(paths: ReactNode) {
  return function Icon({ className = 'size-[18px]' }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className={`flex-none ${className}`}
      >
        {paths}
      </svg>
    )
  }
}

export const DashboardIcon = icon(
  <>
    <rect x="3" y="3" width="7" height="8" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="15" width="7" height="6" rx="1.5" />
  </>,
)
export const CameraIcon = icon(
  <>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </>,
)
export const AlertIcon = icon(
  <>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
)
export const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
)
export const SettingsIcon = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </>,
)
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </>,
)
export const BellIcon = icon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>,
)
export const LogoutIcon = icon(<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />)
export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
)
export const BagIcon = icon(
  <>
    <rect x="4" y="8" width="16" height="13" rx="2" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
)
export const OkIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </>,
)
export const DocIcon = icon(
  <>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M9 12h7M9 16h7" />
  </>,
)
export const RefreshIcon = icon(<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />)
export const ArrowRightIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />)
export const LockIcon = icon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
)
export const EyeIcon = icon(
  <>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)
export const EyeOffIcon = icon(
  <>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4l16 16" />
  </>,
)
export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
)
export const MoonIcon = icon(<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />)
