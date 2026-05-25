import { API_BACKENDS, APP_ENVIRONMENTS } from './configModels'
import { validateConfig } from './configValidation'
import { defaultPublicConfig } from './defaultConfig'
import {
  normalizeBaseUrl,
  readApiBackend,
  readBoolean,
  readEnvironmentName,
  readJson,
  readLogLevel,
  readNumber,
  readString,
} from './envReader'
import { getRuntimeConfigOverride } from './runtimeConfig'

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const deepMerge = (base, override) => {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override
  }

  return Object.keys({ ...base, ...override }).reduce((result, key) => {
    result[key] = deepMerge(base[key], override[key])
    return result
  }, {})
}

const deepFreeze = (value) => {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return value
  }

  Object.freeze(value)
  Object.values(value).forEach((child) => {
    if ((isPlainObject(child) || Array.isArray(child)) && !Object.isFrozen(child)) {
      deepFreeze(child)
    }
  })

  return value
}

const buildEnvConfig = () => {
  const mode = readEnvironmentName()
  const backendMode = readApiBackend()
  const baseUrl =
    normalizeBaseUrl(readString('VITE_API_BASE_URL', defaultPublicConfig.api.baseUrl)) ||
    defaultPublicConfig.api.baseUrl
  const mockLatencyMs = readNumber(
    'VITE_MOCK_API_DELAY_MS',
    defaultPublicConfig.mock.latencyMs,
  )
  const mockErrorRate = readNumber(
    'VITE_MOCK_API_ERROR_RATE',
    defaultPublicConfig.mock.errorRate,
  )
  const mockDbStorageKey = readString(
    'VITE_MOCK_DB_STORAGE_KEY',
    defaultPublicConfig.mock.dbStorageKey,
  )
  const runtimeConfigEnabled = readBoolean(
    'VITE_RUNTIME_CONFIG_ENABLED',
    defaultPublicConfig.runtime.enabled,
  )
  const allowRuntimeOverrides = readBoolean(
    'VITE_ALLOW_RUNTIME_CONFIG',
    defaultPublicConfig.runtime.allowRuntimeOverrides,
  )
  const enableRequestLogging = readBoolean(
    'VITE_ENABLE_REQUEST_LOGGING',
    mode !== APP_ENVIRONMENTS.production,
  )
  const analyticsEnabled = readBoolean(
    'VITE_ANALYTICS_ENABLED',
    defaultPublicConfig.analytics.enabled,
  )
  const runtimeOverride = runtimeConfigEnabled ? getRuntimeConfigOverride() : {
    loadedAt: null,
    override: {},
    source: 'disabled',
  }

  const envOverride = {
    env: {
      isDevelopment: mode === APP_ENVIRONMENTS.development,
      isProduction: mode === APP_ENVIRONMENTS.production,
      isStaging: mode === APP_ENVIRONMENTS.staging,
      isTest: mode === APP_ENVIRONMENTS.test,
      mode,
      name: mode,
    },
    app: {
      description: readString(
        'VITE_APP_DESCRIPTION',
        defaultPublicConfig.app.description,
      ),
      name: readString('VITE_APP_NAME', defaultPublicConfig.app.name),
      supportEmail: readString('VITE_SUPPORT_EMAIL', defaultPublicConfig.app.supportEmail),
      title: readString('VITE_APP_TITLE', defaultPublicConfig.app.title),
      version: readString('VITE_APP_VERSION', defaultPublicConfig.app.version),
    },
    api: {
      authApiUrl: normalizeBaseUrl(readString('VITE_AUTH_API_URL', `${baseUrl}/auth`)),
      backendMode,
      baseUrl,
      cacheTtlMs: readNumber('VITE_API_CACHE_TTL_MS', defaultPublicConfig.api.cacheTtlMs),
      dataSource: backendMode,
      enableRequestLogging,
      isMock: backendMode === API_BACKENDS.mock,
      mockDbStorageKey,
      mockDelayMs: mockLatencyMs,
      mockErrorRate,
      retryCount: readNumber(
        'VITE_API_RETRY_COUNT',
        defaultPublicConfig.api.retryCount,
      ),
      retryDelayMs: readNumber(
        'VITE_API_RETRY_DELAY_MS',
        defaultPublicConfig.api.retryDelayMs,
      ),
      studentCacheTtlMs: readNumber(
        'VITE_STUDENT_API_CACHE_TTL_MS',
        defaultPublicConfig.api.studentCacheTtlMs,
      ),
      teacherCacheTtlMs: readNumber(
        'VITE_TEACHER_API_CACHE_TTL_MS',
        defaultPublicConfig.api.teacherCacheTtlMs,
      ),
      timeoutMs: readNumber('VITE_API_TIMEOUT_MS', defaultPublicConfig.api.timeoutMs),
      useMockApi: backendMode === API_BACKENDS.mock,
      version: readString('VITE_API_VERSION', defaultPublicConfig.api.version),
    },
    auth: {
      mockAuthEnabled: readBoolean(
        'VITE_MOCK_AUTH_ENABLED',
        backendMode === API_BACKENDS.mock,
      ),
      refreshTokenStorageKey: readString(
        'VITE_AUTH_REFRESH_TOKEN_KEY',
        defaultPublicConfig.auth.refreshTokenStorageKey,
      ),
      refreshTtlMs: readNumber(
        'VITE_AUTH_REFRESH_TTL_MS',
        defaultPublicConfig.auth.refreshTtlMs,
      ),
      sessionTtlMs: readNumber(
        'VITE_AUTH_SESSION_TTL_MS',
        defaultPublicConfig.auth.sessionTtlMs,
      ),
      tokenStorageKey: readString(
        'VITE_AUTH_TOKEN_KEY',
        defaultPublicConfig.auth.tokenStorageKey,
      ),
    },
    exams: {
      autoSaveDebounceMs: readNumber(
        'VITE_EXAM_AUTOSAVE_DEBOUNCE_MS',
        defaultPublicConfig.exams.autoSaveDebounceMs,
      ),
      defaultPageSize: readNumber(
        'VITE_EXAM_PAGE_SIZE',
        defaultPublicConfig.exams.defaultPageSize,
      ),
      teacherAutoSaveDebounceMs: readNumber(
        'VITE_TEACHER_EXAM_AUTOSAVE_DEBOUNCE_MS',
        defaultPublicConfig.exams.teacherAutoSaveDebounceMs,
      ),
      teacherDraftStorageKey: readString(
        'VITE_TEACHER_DRAFT_STORAGE_KEY',
        defaultPublicConfig.exams.teacherDraftStorageKey,
      ),
    },
    features: {
      analytics: readBoolean(
        'VITE_FEATURE_ANALYTICS',
        defaultPublicConfig.features.analytics,
      ),
      configDebugPanel: readBoolean(
        'VITE_FEATURE_CONFIG_DEBUG_PANEL',
        mode !== APP_ENVIRONMENTS.production,
      ),
      darkMode: readBoolean(
        'VITE_FEATURE_DARK_MODE',
        defaultPublicConfig.features.darkMode,
      ),
      experimentalFeatures: readBoolean(
        'VITE_FEATURE_EXPERIMENTAL',
        defaultPublicConfig.features.experimentalFeatures,
      ),
      notifications: readBoolean(
        'VITE_FEATURE_NOTIFICATIONS',
        defaultPublicConfig.features.notifications,
      ),
      passwordReset: readBoolean(
        'VITE_FEATURE_PASSWORD_RESET',
        defaultPublicConfig.features.passwordReset,
      ),
      registration: readBoolean(
        'VITE_FEATURE_REGISTRATION',
        defaultPublicConfig.features.registration,
      ),
      remoteConfig: readBoolean(
        'VITE_FEATURE_REMOTE_CONFIG',
        defaultPublicConfig.features.remoteConfig,
      ),
      studentPortal: readBoolean(
        'VITE_FEATURE_STUDENT_PORTAL',
        defaultPublicConfig.features.studentPortal,
      ),
      teacherDashboard: readBoolean(
        'VITE_FEATURE_TEACHER_DASHBOARD',
        defaultPublicConfig.features.teacherDashboard,
      ),
      teacherExamManagement: readBoolean(
        'VITE_FEATURE_TEACHER_EXAM_MANAGEMENT',
        defaultPublicConfig.features.teacherExamManagement,
      ),
    },
    mock: {
      authEnabled: readBoolean('VITE_MOCK_AUTH_ENABLED', backendMode === API_BACKENDS.mock),
      dbStorageKey: mockDbStorageKey,
      demoAccounts: readJson(
        'VITE_MOCK_DEMO_ACCOUNTS',
        defaultPublicConfig.mock.demoAccounts,
      ),
      enabled: backendMode === API_BACKENDS.mock,
      enableErrors: readBoolean('VITE_MOCK_ENABLE_ERRORS', mockErrorRate > 0),
      enableLatency: readBoolean(
        'VITE_MOCK_ENABLE_LATENCY',
        defaultPublicConfig.mock.enableLatency,
      ),
      errorRate: mockErrorRate,
      latencyMs: mockLatencyMs,
      persistDb: readBoolean('VITE_MOCK_PERSIST_DB', defaultPublicConfig.mock.persistDb),
    },
    ui: {
      countdownTickMs: readNumber(
        'VITE_UI_COUNTDOWN_TICK_MS',
        defaultPublicConfig.ui.countdownTickMs,
      ),
      defaultTheme: readString('VITE_UI_DEFAULT_THEME', defaultPublicConfig.ui.defaultTheme),
      themeStorageKey: readString(
        'VITE_THEME_STORAGE_KEY',
        defaultPublicConfig.ui.themeStorageKey,
      ),
      toastDurationMs: readNumber(
        'VITE_TOAST_DURATION_MS',
        defaultPublicConfig.ui.toastDurationMs,
      ),
    },
    logging: {
      enableConfigDiagnostics: readBoolean(
        'VITE_ENABLE_CONFIG_DIAGNOSTICS',
        defaultPublicConfig.logging.enableConfigDiagnostics,
      ),
      enableConsole: readBoolean(
        'VITE_ENABLE_CONSOLE_LOGGING',
        defaultPublicConfig.logging.enableConsole,
      ),
      enableRequestLogging,
      level: readLogLevel(),
    },
    analytics: {
      enabled: analyticsEnabled,
      provider: readString(
        'VITE_ANALYTICS_PROVIDER',
        defaultPublicConfig.analytics.provider,
      ),
      sampleRate: readNumber(
        'VITE_ANALYTICS_SAMPLE_RATE',
        analyticsEnabled ? 1 : defaultPublicConfig.analytics.sampleRate,
      ),
    },
    localization: {
      fallbackLocale: readString(
        'VITE_FALLBACK_LOCALE',
        defaultPublicConfig.localization.fallbackLocale,
      ),
      locale: readString('VITE_LOCALE', defaultPublicConfig.localization.locale),
      timezone: readString('VITE_TIMEZONE', defaultPublicConfig.localization.timezone),
    },
    runtime: {
      allowRuntimeOverrides,
      enabled: runtimeConfigEnabled,
      loadedAt: runtimeOverride.loadedAt,
      remoteConfigUrl: readString(
        'VITE_REMOTE_CONFIG_URL',
        defaultPublicConfig.runtime.remoteConfigUrl,
      ),
      source: runtimeOverride.source,
    },
    private: {},
  }

  const withEnv = deepMerge(defaultPublicConfig, envOverride)

  return withEnv.runtime.allowRuntimeOverrides
    ? deepMerge(withEnv, runtimeOverride.override)
    : withEnv
}

const normalizeDerivedConfig = (config) => {
  const backendMode = Object.values(API_BACKENDS).includes(config.api.backendMode)
    ? config.api.backendMode
    : config.api.dataSource
  const normalizedBackendMode = Object.values(API_BACKENDS).includes(backendMode)
    ? backendMode
    : API_BACKENDS.mock
  const useMockApi = normalizedBackendMode === API_BACKENDS.mock

  return deepMerge(config, {
    api: {
      backendMode: normalizedBackendMode,
      dataSource: normalizedBackendMode,
      isMock: useMockApi,
      mockDbStorageKey: config.mock.dbStorageKey,
      mockDelayMs: config.mock.latencyMs,
      mockErrorRate: config.mock.errorRate,
      useMockApi,
    },
    mock: {
      enabled: useMockApi,
    },
  })
}

const createConfig = () => {
  const rawConfig = normalizeDerivedConfig(buildEnvConfig())
  const diagnostics = validateConfig(rawConfig)
  const config = deepMerge(rawConfig, {
    diagnostics,
  })

  if (
    config.logging.enableConsole &&
    config.logging.enableConfigDiagnostics &&
    diagnostics.warnings.length > 0
  ) {
    console.warn('[config] Configuration warnings:', diagnostics.warnings)
  }

  if (diagnostics.errors.length > 0) {
    const message = `[config] Invalid application configuration: ${diagnostics.errors.join(' ')}`

    if (config.env.isProduction) {
      throw new Error(message)
    }

    console.error(message)
  }

  return deepFreeze(config)
}

/** @type {import('./configModels').AppConfiguration} */
const config = createConfig()

const getPathValue = (source, path, fallback) => {
  const value = String(path)
    .split('.')
    .reduce((current, key) => (current == null ? undefined : current[key]), source)

  return value === undefined ? fallback : value
}

export const configService = Object.freeze({
  get(path, fallback) {
    return path ? getPathValue(config, path, fallback) : config
  },
  getConfig() {
    return config
  },
  getDiagnostics() {
    return config.diagnostics
  },
  getEnvironment() {
    return config.env
  },
  getPublicConfigSnapshot() {
    return config
  },
  isFeatureEnabled(flagName) {
    return Boolean(config.features[flagName])
  },
  isMockApiEnabled() {
    return config.api.useMockApi
  },
  validate() {
    return validateConfig(config)
  },
})

export const appConfig = config
export const isFeatureEnabled = (flagName) => configService.isFeatureEnabled(flagName)
export const isMockApiEnabled = () => configService.isMockApiEnabled()
