import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUser,
  login,
  logout,
  signup,
  USER_ROLES,
} from '../src/api/authService'
import { clearAuthToken, getAuthToken } from '../src/api/authTokenStorage'
import { mockDb } from '../src/api/mockDb'
import { MOCK_API_DELAY_MS } from '../src/api/mockApiClient'

const originalUsers = structuredClone(mockDb.users)

const resolveMockRequest = async (request) => {
  await vi.advanceTimersByTimeAsync(MOCK_API_DELAY_MS)
  return request
}

describe('authService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockDb.users = structuredClone(originalUsers)
    mockDb.sessions = []
    clearAuthToken()
  })

  afterEach(() => {
    clearAuthToken()
    vi.useRealTimers()
  })

  it('logs in a teacher and stores a mock session token', async () => {
    const session = await resolveMockRequest(
      login({ email: 'teacher@example.com', password: 'teacher123' }),
    )

    expect(session.user).toMatchObject({
      email: 'teacher@example.com',
      name: 'Dr. Cohen',
      role: USER_ROLES.teacher,
    })
    expect(session.user.password).toBeUndefined()
    expect(getAuthToken()).toBe(session.token)
    expect(mockDb.sessions).toHaveLength(1)
  })

  it('rejects invalid credentials without creating a session', async () => {
    const request = login({
      email: 'teacher@example.com',
      password: 'wrong-password',
    })
    const assertion = expect(request).rejects.toThrow('Invalid email or password.')

    await vi.advanceTimersByTimeAsync(MOCK_API_DELAY_MS)

    await assertion
    expect(getAuthToken()).toBeNull()
    expect(mockDb.sessions).toHaveLength(0)
  })

  it('registers a student and makes that user current', async () => {
    const session = await resolveMockRequest(
      signup({
        email: 'new.student@example.com',
        name: 'New Student',
        password: 'secret1',
        role: USER_ROLES.student,
      }),
    )

    const currentUser = await resolveMockRequest(getCurrentUser())

    expect(session.user).toMatchObject({
      email: 'new.student@example.com',
      name: 'New Student',
      role: USER_ROLES.student,
    })
    expect(currentUser).toEqual(session.user)
    expect(mockDb.users).toContainEqual(
      expect.objectContaining({
        email: 'new.student@example.com',
        role: USER_ROLES.student,
      }),
    )
  })

  it('returns null when there is no current session', async () => {
    const currentUser = await resolveMockRequest(getCurrentUser())

    expect(currentUser).toBeNull()
  })

  it('logs out and clears the current session', async () => {
    await resolveMockRequest(
      login({ email: 'student@example.com', password: 'student123' }),
    )

    await resolveMockRequest(logout())
    const currentUser = await resolveMockRequest(getCurrentUser())

    expect(currentUser).toBeNull()
    expect(getAuthToken()).toBeNull()
    expect(mockDb.sessions).toHaveLength(0)
  })
})
