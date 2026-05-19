/**
 * Auth API facade. UI code should depend on these functions, not on mockDb.
 * A future backend version can keep the same function signatures and replace
 * the internals with fetch/axios calls.
 */
import { clearAuthToken, getAuthToken, saveAuthToken } from './authTokenStorage'
import { apiClient, mockRequest } from './apiClient'
import { appConfig } from '../config'
import { mockDb } from './mockDb'

export const USER_ROLES = {
  student: 'student',
  teacher: 'teacher',
}

const SESSION_TTL_MS = appConfig.auth.sessionTtlMs

const normalizeEmail = (email) => String(email).trim().toLowerCase()

const publicUser = ({ id, name, email, role, createdAt, updatedAt }) => ({
  id,
  name,
  email,
  role,
  createdAt,
  updatedAt,
})

const findUserByEmail = (email) =>
  mockDb.users.find((user) => user.email === normalizeEmail(email))

const findActiveSession = (token) => {
  const session = mockDb.sessions.find((item) => item.token === token)

  if (!session) {
    return null
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    mockDb.sessions = mockDb.sessions.filter((item) => item.token !== token)
    return null
  }

  return session
}

const createToken = (userId) => {
  const tokenId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `mock-token-${userId}-${tokenId}`
}

const createSession = (userId) => {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS)
  const token = createToken(userId)

  const session = {
    token,
    userId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  mockDb.sessions.push(session)
  saveAuthToken(token)

  return session
}

const requireAuthPayload = ({ email, password }) => {
  if (!String(email ?? '').trim() || !String(password ?? '').trim()) {
    throw new Error('Email and password are required.')
  }
}

const persistSession = (session) => {
  if (session?.token) {
    saveAuthToken(session.token)
  }

  return session
}

const mockLogin = ({ email, password }) =>
  mockRequest(() => {
    requireAuthPayload({ email, password })

    const user = findUserByEmail(email)

    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.')
    }

    const session = createSession(user.id)

    return {
      token: session.token,
      user: publicUser(user),
      expiresAt: session.expiresAt,
    }
  })

const mockSignup = ({ name, email, password, role }) =>
  mockRequest(() => {
    if (!appConfig.features.registration) {
      throw new Error('Registration is currently disabled.')
    }

    requireAuthPayload({ email, password })

    const trimmedName = String(name ?? '').trim()
    const normalizedRole = String(role ?? '').trim().toLowerCase()

    if (!trimmedName) {
      throw new Error('Name is required.')
    }

    if (!Object.values(USER_ROLES).includes(normalizedRole)) {
      throw new Error('Please choose a valid role.')
    }

    if (String(password).length < 6) {
      throw new Error('Password must be at least 6 characters.')
    }

    if (findUserByEmail(email)) {
      throw new Error('An account with this email already exists.')
    }

    const now = new Date().toISOString()
    const user = {
      id: `${normalizedRole === USER_ROLES.teacher ? 'TCH' : 'STU'}-${Date.now()}`,
      name: trimmedName,
      email: normalizeEmail(email),
      password,
      role: normalizedRole,
      createdAt: now,
      updatedAt: now,
    }

    mockDb.users.push(user)
    const session = createSession(user.id)

    return {
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

    return { success: true }
  })

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
