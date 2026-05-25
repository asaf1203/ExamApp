/**
 * Auth API facade. UI code should depend on these functions, not on mockDb.
 * A future backend version can keep the same function signatures and replace
 * the internals with fetch/axios calls.
 */
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  saveRefreshToken,
} from './authTokenStorage'
import { ApiError, apiClient, mockRequest } from './apiClient'
import { appConfig } from '../config'
import { mockDb, persistMockDb } from './mockDb'

export const USER_ROLES = {
  student: 'student',
  teacher: 'teacher',
}

const SESSION_TTL_MS = appConfig.auth.sessionTtlMs
const REFRESH_TTL_MS = appConfig.auth.refreshTtlMs

const normalizeEmail = (email) => String(email).trim().toLowerCase()

const publicUser = ({ id, name, email, role, createdAt, updatedAt, lastLoginAt }) => ({
  id,
  name,
  email,
  role,
  createdAt,
  lastLoginAt,
  updatedAt,
})

const findUserByEmail = (email) =>
  mockDb.users.find((user) => user.email === normalizeEmail(email))

export const findActiveSession = (token) => {
  const session = mockDb.sessions.find((item) => item.token === token)

  if (!session) {
    return null
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    mockDb.sessions = mockDb.sessions.filter((item) => item.token !== token)
    persistMockDb()
    return null
  }

  return session
}

const createToken = (userId, prefix = 'mock-token') => {
  const tokenId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${prefix}-${userId}-${tokenId}`
}

const createSession = (userId) => {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS)
  const refreshExpiresAt = new Date(issuedAt.getTime() + REFRESH_TTL_MS)
  const token = createToken(userId)
  const refreshToken = createToken(userId, 'mock-refresh')

  const session = {
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    refreshToken,
    issuedAt: issuedAt.toISOString(),
    token,
    userId,
    expiresAt: expiresAt.toISOString(),
  }

  mockDb.sessions.push(session)
  saveAuthToken(token)
  saveRefreshToken(refreshToken)
  persistMockDb()

  return session
}

const requireAuthPayload = ({ email, password }) => {
  if (!String(email ?? '').trim() || !String(password ?? '').trim()) {
    throw new ApiError('Email and password are required.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }
}

const requireValidEmail = (email) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim())) {
    throw new ApiError('Please enter a valid email address.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }
}

const persistSession = (session) => {
  if (session?.token) {
    saveAuthToken(session.token)
  }

  if (session?.refreshToken) {
    saveRefreshToken(session.refreshToken)
  }

  return session
}

const mockLogin = ({ email, password }) =>
  mockRequest(() => {
    requireAuthPayload({ email, password })
    requireValidEmail(email)

    const user = findUserByEmail(email)

    if (!user || user.password !== password) {
      throw new ApiError('Invalid email or password.', {
        code: 'INVALID_CREDENTIALS',
        status: 401,
      })
    }

    user.lastLoginAt = new Date().toISOString()
    user.updatedAt = user.lastLoginAt
    const session = createSession(user.id)
    persistMockDb()

    return {
      refreshToken: session.refreshToken,
      token: session.token,
      user: publicUser(user),
      expiresAt: session.expiresAt,
    }
  })

const mockSignup = ({ name, email, password, role }) =>
  mockRequest(() => {
    if (!appConfig.features.registration) {
      throw new ApiError('Registration is currently disabled.', {
        code: 'REGISTRATION_DISABLED',
        status: 403,
      })
    }

    requireAuthPayload({ email, password })
    requireValidEmail(email)

    const trimmedName = String(name ?? '').trim()
    const normalizedRole = String(role ?? '').trim().toLowerCase()

    if (!trimmedName) {
      throw new ApiError('Name is required.', {
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }

    if (!Object.values(USER_ROLES).includes(normalizedRole)) {
      throw new ApiError('Please choose a valid role.', {
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }

    if (String(password).length < 6) {
      throw new ApiError('Password must be at least 6 characters.', {
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }

    if (findUserByEmail(email)) {
      throw new ApiError('An account with this email already exists.', {
        code: 'EMAIL_TAKEN',
        status: 409,
      })
    }

    const now = new Date().toISOString()
    const user = {
      id: `${normalizedRole === USER_ROLES.teacher ? 'TCH' : 'STU'}-${Date.now()}`,
      name: trimmedName,
      email: normalizeEmail(email),
      password,
      role: normalizedRole,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
    }

    mockDb.users.push(user)
    const session = createSession(user.id)
    persistMockDb()

    return {
      refreshToken: session.refreshToken,
      token: session.token,
      user: publicUser(user),
      expiresAt: session.expiresAt,
    }
  })

const mockGetCurrentUser = () =>
  mockRequest(() => {
    const token = getAuthToken()

    if (!token) {
      return null
    }

    const session = findActiveSession(token)

    if (!session) {
      clearAuthToken()
      return null
    }

    const user = mockDb.users.find((item) => item.id === session.userId)

    if (!user) {
      clearAuthToken()
      return null
    }

    return publicUser(user)
  })

const mockLogout = () =>
  mockRequest(() => {
    const token = getAuthToken()

    if (token) {
      mockDb.sessions = mockDb.sessions.filter((session) => session.token !== token)
    }

    clearAuthToken()
    persistMockDb()

    return { success: true }
  })

const mockRequestPasswordReset = ({ email }) =>
  mockRequest(() => {
    requireValidEmail(email)

    const user = findUserByEmail(email)
    const now = new Date().toISOString()

    if (user) {
      user.passwordResetRequestedAt = now
      user.updatedAt = now
      persistMockDb()
    }

    return {
      email: normalizeEmail(email),
      success: true,
    }
  })

export const getAuthenticatedMockUser = () => {
  const token = getAuthToken()

  if (!token) {
    throw new ApiError('Authentication required.', {
      code: 'AUTH_REQUIRED',
      status: 401,
    })
  }

  const session = findActiveSession(token)

  if (!session) {
    clearAuthToken()
    throw new ApiError('Session expired. Please sign in again.', {
      code: 'SESSION_EXPIRED',
      status: 401,
    })
  }

  const user = mockDb.users.find((item) => item.id === session.userId)

  if (!user) {
    clearAuthToken()
    throw new ApiError('Session user was not found.', {
      code: 'SESSION_USER_MISSING',
      status: 401,
    })
  }

  return user
}

export const requireMockRole = (roles) => {
  const user = getAuthenticatedMockUser()
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (!allowedRoles.includes(user.role)) {
    throw new ApiError('You do not have permission to access this resource.', {
      code: 'FORBIDDEN',
      status: 403,
    })
  }

  return user
}

export const refreshSession = async () => {
  if (!apiClient.isMock) {
    // TODO backend: call POST /auth/refresh and persist the returned token pair.
    return apiClient
      .post('/auth/refresh', { refreshToken: getRefreshToken() })
      .then(persistSession)
  }

  return mockRequest(() => {
    const refreshToken = getRefreshToken()
    const existingSession = mockDb.sessions.find(
      (session) => session.refreshToken === refreshToken,
    )

    if (
      !existingSession ||
      new Date(existingSession.refreshExpiresAt).getTime() <= Date.now()
    ) {
      clearAuthToken()
      throw new ApiError('Refresh session expired. Please sign in again.', {
        code: 'REFRESH_EXPIRED',
        status: 401,
      })
    }

    mockDb.sessions = mockDb.sessions.filter(
      (session) => session.refreshToken !== refreshToken,
    )
    const session = createSession(existingSession.userId)
    persistMockDb()

    return {
      refreshToken: session.refreshToken,
      token: session.token,
      expiresAt: session.expiresAt,
    }
  })
}

export const login = async ({ email, password }) =>
  apiClient.isMock
    ? mockLogin({ email, password })
    : apiClient.post('/auth/login', { email, password }).then(persistSession)

export const signup = async ({ name, email, password, role }) =>
  apiClient.isMock
    ? mockSignup({ email, name, password, role })
    : apiClient
        .post('/auth/signup', { email, name, password, role })
        .then(persistSession)

export const getCurrentUser = async () => {
  if (apiClient.isMock) {
    return mockGetCurrentUser()
  }

  if (!getAuthToken()) {
    return null
  }

  return apiClient.get('/auth/me').catch(() => {
    clearAuthToken()
    return null
  })
}

export const logout = async () => {
  if (apiClient.isMock) {
    return mockLogout()
  }

  return apiClient.post('/auth/logout').finally(() => {
    clearAuthToken()
  })
}

export const requestPasswordReset = async ({ email }) =>
  apiClient.isMock
    ? mockRequestPasswordReset({ email })
    : apiClient.post('/auth/password-reset', { email })
