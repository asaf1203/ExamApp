export const APP_ENVIRONMENTS = Object.freeze({
  development: 'development',
  production: 'production',
  staging: 'staging',
  test: 'test',
})

export const API_BACKENDS = Object.freeze({
  http: 'http',
  mock: 'mock',
})

export const LOG_LEVELS = Object.freeze({
  debug: 'debug',
  error: 'error',
  info: 'info',
  silent: 'silent',
  warn: 'warn',
})

/**
 * Public, browser-safe configuration shape.
 *
 * @typedef {'development'|'test'|'staging'|'production'} AppEnvironment
 * @typedef {'mock'|'http'} ApiBackend
 * @typedef {'debug'|'info'|'warn'|'error'|'silent'} LogLevel
 *
 * @typedef {Object} AppConfiguration
 * @property {{mode: AppEnvironment, name: AppEnvironment, isDevelopment: boolean, isTest: boolean, isStaging: boolean, isProduction: boolean}} env
 * @property {{name: string, title: string, description: string, version: string, supportEmail: string}} app
 * @property {{baseUrl: string, version: string, authApiUrl: string, dataSource: ApiBackend, backendMode: ApiBackend, useMockApi: boolean, isMock: boolean, timeoutMs: number, retryCount: number, retryDelayMs: number, cacheTtlMs: number, studentCacheTtlMs: number, teacherCacheTtlMs: number, enableRequestLogging: boolean, mockDelayMs: number, mockErrorRate: number, mockDbStorageKey: string}} api
 * @property {{enabled: boolean, enableLatency: boolean, latencyMs: number, enableErrors: boolean, errorRate: number, persistDb: boolean, dbStorageKey: string, authEnabled: boolean, demoAccounts: {role: string, email: string, password: string}[]}} mock
 * @property {{tokenStorageKey: string, refreshTokenStorageKey: string, sessionTtlMs: number, refreshTtlMs: number, mockAuthEnabled: boolean}} auth
 * @property {Record<string, boolean>} features
 * @property {{autoSaveDebounceMs: number, defaultPageSize: number, teacherDraftStorageKey: string, teacherAutoSaveDebounceMs: number}} exams
 * @property {{defaultTheme: 'light'|'dark'|'system', themeStorageKey: string, toastDurationMs: number, countdownTickMs: number, notificationPollMs: number}} ui
 * @property {{level: LogLevel, enableConsole: boolean, enableConfigDiagnostics: boolean, enableRequestLogging: boolean}} logging
 * @property {{enabled: boolean, provider: string, sampleRate: number}} analytics
 * @property {{locale: string, fallbackLocale: string, timezone: string}} localization
 * @property {{roles: string[], defaultRole: string, teacherRole: string, studentRole: string}} permissions
 * @property {{enabled: boolean, allowRuntimeOverrides: boolean, remoteConfigUrl: string, loadedAt: string|null, source: string}} runtime
 * @property {{errors: string[], warnings: string[]}} diagnostics
 * @property {Object} private
 */
