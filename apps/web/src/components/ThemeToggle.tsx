import { useTheme } from '../lib/theme'
import { IconButton } from './Button'
import { MoonIcon, SunIcon } from './icons'

/** Switches between the light and dark theme. The choice is remembered in this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <IconButton
      label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
      className={className}
    >
      {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </IconButton>
  )
}
