/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appConfig, isFeatureEnabled } from '../config'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
  if (typeof window === 'undefined' || !isFeatureEnabled('darkMode')) {
    return 'light'
  }

  let saved

  try {
    saved = window.localStorage?.getItem?.(appConfig.ui.themeStorageKey) ?? null
  } catch {
    saved = null
  }

  if (saved === 'light' || saved === 'dark') {
    return saved
  }

  if (appConfig.ui.defaultTheme === 'light' || appConfig.ui.defaultTheme === 'dark') {
    return appConfig.ui.defaultTheme
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.body.dataset.theme = theme
    document.documentElement.dataset.bsTheme = theme

    try {
      window.localStorage?.setItem?.(appConfig.ui.themeStorageKey, theme)
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }
  }, [theme])

  const value = useMemo(
    () => ({
      isDark: theme === 'dark',
      setTheme,
      theme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return context
}
