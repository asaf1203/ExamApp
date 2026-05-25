/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appConfig } from '../config'

const THEME_STORAGE_KEY = 'examPlatform.theme'
const ThemeContext = createContext(null)

const getInitialTheme = () => {
  if (typeof window === 'undefined' || !appConfig.features.darkMode) {
    return 'light'
  }

  let saved

  try {
    saved = window.localStorage?.getItem?.(THEME_STORAGE_KEY) ?? null
  } catch {
    saved = null
  }

  if (saved === 'light' || saved === 'dark') {
    return saved
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.body.dataset.theme = theme
    document.documentElement.dataset.bsTheme = theme

    try {
      window.localStorage?.setItem?.(THEME_STORAGE_KEY, theme)
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
