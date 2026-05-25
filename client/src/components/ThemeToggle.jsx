import { isFeatureEnabled } from '../config'
import { useTheme } from '../ui/ThemeContext'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  if (!isFeatureEnabled('darkMode')) {
    return null
  }

  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn btn-icon"
      onClick={toggleTheme}
      title={isDark ? 'Light mode' : 'Dark mode'}
      type="button"
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  )
}
