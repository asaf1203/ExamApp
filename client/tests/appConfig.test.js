import { describe, expect, it } from 'vitest'
import { appConfig } from '../src/config'

describe('appConfig', () => {
  it('exposes frontend environment, API, auth, feature, and app settings', () => {
    expect(appConfig.env.mode).toBeTruthy()
    expect(appConfig.api).toMatchObject({
      baseUrl: '/api',
      dataSource: 'mock',
      isMock: true,
      mockDelayMs: 450,
    })
    expect(appConfig.auth.tokenStorageKey).toBe('examPlatform.authToken')
    expect(appConfig.features.registration).toBe(true)
    expect(appConfig.app.name).toBe('E-Test System')
  })
})
