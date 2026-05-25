const DEFAULT_MOCK_DELAY_MS = 450
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8
const DEFAULT_REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 7

const rawEnv = import.meta.env ?? {}

const readString = (key, fallback = '') => {
  const value = rawEnv[key]

  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

const readNumber = (key, fallback) => {
  const rawValue = readString(key)

  if (!rawValue) {
    return fallback
  }

  const value = Number(rawValue)

  return Number.isFinite(value) ? value : fallback
}

const readBoolean = (key, fallback) => {
  const value = readString(key).toLowerCase()

  if (['true', '1', 'yes', 'on'].includes(value)) {
    return true
  }

  if (['false', '0', 'no', 'off'].includes(value)) {
    return false
  }

  return fallback
}

const readEnum = (key, allowedValues, fallback) => {
  const value = readString(key, fallback).toLowerCase()

  return allowedValues.includes(value) ? value : fallback
}

const normalizeBaseUrl = (url) => {
  const value = url.trim()

  if (!value || value === '/') {
    return ''
  }

  return value.replace(/\/+$/, '')
}

const mode = readString('MODE', 'development')
const apiDataSource = readEnum('VITE_API_DATA_SOURCE', ['mock', 'http'], 'mock')

/**
 * Centralized frontend configuration.
 *
 * React/Vite only exposes variables prefixed with VITE_, so this module is the
 * single place that reads public frontend environment variables. Service/UI
 * modules consume this typed object instead of reaching into import.meta.env.
 */
export const appConfig = Object.freeze({
  env: Object.freeze({
    mode,
    isDevelopment: mode === 'development',
    isProduction: mode === 'production',
    isTest: mode === 'test',
  }),
  app: Object.freeze({
    name: readString('VITE_APP_NAME', 'E-Test System'),
    title: readString('VITE_APP_TITLE', 'Mock Exam Platform'),
    description: readString(
      'VITE_APP_DESCRIPTION',
      'React components prepared for a future Node.js backend.',
    ),
  }),
  api: Object.freeze({
    baseUrl: normalizeBaseUrl(readString('VITE_API_BASE_URL', '/api')),
    dataSource: apiDataSource,
    isMock: apiDataSource === 'mock',
    mockDelayMs: readNumber('VITE_MOCK_API_DELAY_MS', DEFAULT_MOCK_DELAY_MS),
    mockErrorRate: readNumber('VITE_MOCK_API_ERROR_RATE', 0),
    mockDbStorageKey: readString('VITE_MOCK_DB_STORAGE_KEY', 'examPlatform.mockDb.v2'),
    retryCount: readNumber('VITE_API_RETRY_COUNT', 1),
    timeoutMs: readNumber('VITE_API_TIMEOUT_MS', 10000),
  }),
  auth: Object.freeze({
    refreshTokenStorageKey: readString(
      'VITE_AUTH_REFRESH_TOKEN_KEY',
      'examPlatform.refreshToken',
    ),
    tokenStorageKey: readString('VITE_AUTH_TOKEN_KEY', 'examPlatform.authToken'),
    refreshTtlMs: readNumber('VITE_AUTH_REFRESH_TTL_MS', DEFAULT_REFRESH_TTL_MS),
    sessionTtlMs: readNumber('VITE_AUTH_SESSION_TTL_MS', DEFAULT_SESSION_TTL_MS),
  }),
  exams: Object.freeze({
    autoSaveDebounceMs: readNumber('VITE_EXAM_AUTOSAVE_DEBOUNCE_MS', 900),
    defaultPageSize: readNumber('VITE_EXAM_PAGE_SIZE', 20),
  }),
  features: Object.freeze({
    darkMode: readBoolean('VITE_FEATURE_DARK_MODE', true),
    passwordReset: readBoolean('VITE_FEATURE_PASSWORD_RESET', true),
    registration: readBoolean('VITE_FEATURE_REGISTRATION', true),
    studentPortal: readBoolean('VITE_FEATURE_STUDENT_PORTAL', true),
    teacherDashboard: readBoolean('VITE_FEATURE_TEACHER_DASHBOARD', true),
  }),
})
