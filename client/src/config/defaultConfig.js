import { API_BACKENDS, APP_ENVIRONMENTS, LOG_LEVELS } from './configModels'

export const DEFAULT_MOCK_DELAY_MS = 450
export const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8
export const DEFAULT_REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 7

export const defaultPublicConfig = Object.freeze({
  env: Object.freeze({
    mode: APP_ENVIRONMENTS.development,
    name: APP_ENVIRONMENTS.development,
    isDevelopment: true,
    isProduction: false,
    isStaging: false,
    isTest: false,
  }),
  app: Object.freeze({
    description: 'React components prepared for a future Node.js backend.',
    name: 'E-Test System',
    supportEmail: 'support@example.com',
    title: 'Mock Exam Platform',
    version: '0.0.0',
  }),
  api: Object.freeze({
    authApiUrl: '/api/auth',
    backendMode: API_BACKENDS.mock,
    baseUrl: '/api',
    cacheTtlMs: 30000,
    dataSource: API_BACKENDS.mock,
    enableRequestLogging: false,
    isMock: true,
    mockDbStorageKey: 'examPlatform.mockDb.v2',
    mockDelayMs: DEFAULT_MOCK_DELAY_MS,
    mockErrorRate: 0,
    retryCount: 1,
    retryDelayMs: 250,
    studentCacheTtlMs: 10000,
    teacherCacheTtlMs: 8000,
    timeoutMs: 10000,
    useMockApi: true,
    version: 'v1',
  }),
  auth: Object.freeze({
    mockAuthEnabled: true,
    refreshTokenStorageKey: 'examPlatform.refreshToken',
    refreshTtlMs: DEFAULT_REFRESH_TTL_MS,
    sessionTtlMs: DEFAULT_SESSION_TTL_MS,
    tokenStorageKey: 'examPlatform.authToken',
  }),
  exams: Object.freeze({
    autoSaveDebounceMs: 900,
    defaultPageSize: 20,
    teacherAutoSaveDebounceMs: 1000,
    teacherDraftStorageKey: 'examPlatform.teacher.newExamDraft',
  }),
  features: Object.freeze({
    analytics: false,
    configDebugPanel: true,
    darkMode: true,
    experimentalFeatures: false,
    notifications: true,
    passwordReset: true,
    registration: true,
    remoteConfig: false,
    studentPortal: true,
    teacherDashboard: true,
    teacherExamManagement: true,
  }),
  mock: Object.freeze({
    authEnabled: true,
    dbStorageKey: 'examPlatform.mockDb.v2',
    demoAccounts: Object.freeze([
      Object.freeze({
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
      }),
      Object.freeze({
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
      }),
    ]),
    enabled: true,
    enableErrors: false,
    enableLatency: true,
    errorRate: 0,
    latencyMs: DEFAULT_MOCK_DELAY_MS,
    persistDb: true,
  }),
  ui: Object.freeze({
    countdownTickMs: 1000,
    defaultTheme: 'system',
    notificationPollMs: 30000,
    themeStorageKey: 'examPlatform.theme',
    toastDurationMs: 4500,
  }),
  logging: Object.freeze({
    enableConfigDiagnostics: true,
    enableConsole: true,
    enableRequestLogging: false,
    level: LOG_LEVELS.info,
  }),
  analytics: Object.freeze({
    enabled: false,
    provider: 'none',
    sampleRate: 0,
  }),
  localization: Object.freeze({
    fallbackLocale: 'en-US',
    locale: 'en-US',
    timezone: 'local',
  }),
  permissions: Object.freeze({
    defaultRole: 'student',
    roles: Object.freeze(['student', 'teacher']),
    studentRole: 'student',
    teacherRole: 'teacher',
  }),
  runtime: Object.freeze({
    allowRuntimeOverrides: true,
    enabled: true,
    loadedAt: null,
    remoteConfigUrl: '',
    source: 'static',
  }),
  diagnostics: Object.freeze({
    errors: Object.freeze([]),
    warnings: Object.freeze([]),
  }),
  // Frontend builds must never contain real secrets. This explicit private
  // section lets validation reject accidental secret exposure later.
  private: Object.freeze({}),
})
