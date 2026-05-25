import { API_BACKENDS, APP_ENVIRONMENTS } from './configModels'

const isPositiveNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const isNonNegativeNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const validateConfig = (config) => {
  const errors = []
  const warnings = []

  if (!Object.values(APP_ENVIRONMENTS).includes(config.env.mode)) {
    warnings.push(`Unknown app environment "${config.env.mode}".`)
  }

  if (!Object.values(API_BACKENDS).includes(config.api.backendMode)) {
    errors.push(`Invalid API backend "${config.api.backendMode}".`)
  }

  if (!isPositiveNumber(config.api.timeoutMs)) {
    errors.push('API timeout must be a positive number.')
  }

  if (!Number.isInteger(config.api.retryCount) || config.api.retryCount < 0) {
    errors.push('API retry count must be a non-negative integer.')
  }

  if (!isNonNegativeNumber(config.api.retryDelayMs)) {
    errors.push('API retry delay must be a non-negative number.')
  }

  if (!isPositiveNumber(config.api.cacheTtlMs)) {
    errors.push('API cache TTL must be a positive number.')
  }

  if (config.api.backendMode === API_BACKENDS.http && !config.api.baseUrl) {
    warnings.push('HTTP API backend is enabled without VITE_API_BASE_URL. Using same-origin /api.')
  }

  if (config.env.isProduction && config.api.useMockApi) {
    warnings.push('Production mode is using the mock API. Set VITE_API_BACKEND=http for real deployments.')
  }

  if (config.mock.errorRate < 0 || config.mock.errorRate > 1) {
    errors.push('Mock error rate must be between 0 and 1.')
  }

  if (!isNonNegativeNumber(config.mock.latencyMs)) {
    errors.push('Mock latency must be a non-negative number.')
  }

  if (!config.auth.tokenStorageKey || !config.auth.refreshTokenStorageKey) {
    errors.push('Auth storage keys are required.')
  }

  if (!isPositiveNumber(config.auth.sessionTtlMs) || !isPositiveNumber(config.auth.refreshTtlMs)) {
    errors.push('Auth session TTL values must be positive numbers.')
  }

  if (
    !isPositiveNumber(config.ui.toastDurationMs) ||
    !isPositiveNumber(config.ui.countdownTickMs) ||
    !isPositiveNumber(config.ui.notificationPollMs)
  ) {
    errors.push('UI timing values must be positive numbers.')
  }

  if (config.features.analytics && !config.analytics.enabled) {
    warnings.push('Feature flag "analytics" is enabled while analytics.enabled is false.')
  }

  if (Object.keys(config.private ?? {}).length > 0) {
    errors.push('Private configuration must not be exposed in the frontend bundle.')
  }

  return { errors, warnings }
}
