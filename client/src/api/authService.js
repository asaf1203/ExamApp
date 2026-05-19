/**
 * Auth API facade. UI code should depend on these functions, not on mockDb.
 * A future backend version can keep the same function signatures and replace
 * the internals with fetch/axios calls.
 */
import { clearAuthToken, getAuthToken, saveAuthToken } from './authTokenStorage'
import { mockDb } from './mockDb'
import { simulateRequest } from './mockApiClient'

export const USER_ROLES = {
  student: 'student',
  teacher: 'teacher',
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 8

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

export const login = async ({ email, password }) =>
  simulateRequest(() => {
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

export const signup = async ({ name, email, password, role }) =>
  simulateRequest(() => {
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

export const getCurrentUser = async () =>
  simulateRequest(() => {
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

export const logout = async () =>
  simulateRequest(() => {
    const token = getAuthToken()

    if (token) {
      mockDb.sessions = mockDb.sessions.filter((session) => session.token !== token)
    }

    clearAuthToken()

    return { success: true }
  })
