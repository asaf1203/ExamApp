import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from '../api/authService'
import { AuthContext } from './authState'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()

        if (isActive) {
          setCurrentUser(user)
        }
      } catch (error) {
        if (isActive) {
          setAuthError(error.message)
        }
      } finally {
        if (isActive) {
          setInitializing(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    try {
      setAuthError('')
      const session = await loginRequest(credentials)
      setCurrentUser(session.user)
      return session
    } catch (error) {
      setAuthError(error.message)
      throw error
    }
  }, [])

  const signup = useCallback(async (payload) => {
    try {
      setAuthError('')
      const session = await signupRequest(payload)
      setCurrentUser(session.user)
      return session
    } catch (error) {
      setAuthError(error.message)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setAuthError('')
      await logoutRequest()
      setCurrentUser(null)
    } catch (error) {
      setAuthError(error.message)
      throw error
    }
  }, [])

  const value = useMemo(
    () => ({
      authError,
      clearAuthError: () => setAuthError(''),
      currentUser,
      initializing,
      isAuthenticated: Boolean(currentUser),
      login,
      logout,
      role: currentUser?.role ?? null,
      signup,
    }),
    [authError, currentUser, initializing, login, logout, signup],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
