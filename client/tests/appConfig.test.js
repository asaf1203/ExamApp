import { describe, expect, it } from 'vitest'
import {
  API_BACKENDS,
  appConfig,
  configService,
  isFeatureEnabled,
  isMockApiEnabled,
} from '../src/config'

describe('appConfig', () => {
  it('exposes frontend environment, API, auth, feature, and app settings', () => {
    expect(appConfig.env.mode).toBeTruthy()
    expect(appConfig.api).toMatchObject({
      baseUrl: '/api',
      backendMode: API_BACKENDS.mock,
      dataSource: API_BACKENDS.mock,
      isMock: true,
      mockDelayMs: 450,
      retryCount: 1,
      timeoutMs: 10000,
    })
    expect(appConfig.auth.tokenStorageKey).toBe('examPlatform.authToken')
    expect(appConfig.auth.refreshTokenStorageKey).toBe('examPlatform.refreshToken')
    expect(appConfig.features.registration).toBe(true)
    expect(appConfig.mock).toMatchObject({
      enabled: true,
      latencyMs: 450,
      persistDb: true,
    })
    expect(appConfig.app.name).toBe('E-Test System')
  })

  it('provides read-only config service helpers', () => {
    expect(Object.isFrozen(appConfig)).toBe(true)
    expect(configService.get('api.baseUrl')).toBe('/api')
    expect(configService.get('missing.value', 'fallback')).toBe('fallback')
    expect(configService.getEnvironment()).toBe(appConfig.env)
    expect(configService.getPublicConfigSnapshot()).toBe(appConfig)
    expect(configService.getDiagnostics()).toEqual({
      errors: [],
      warnings: [],
    })
  })

  it('exposes feature flag and backend helpers', () => {
    expect(isFeatureEnabled('teacherDashboard')).toBe(true)
    expect(isFeatureEnabled('unknownFlag')).toBe(false)
    expect(isMockApiEnabled()).toBe(true)
    expect(configService.isMockApiEnabled()).toBe(true)
  })
})
