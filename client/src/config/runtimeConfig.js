const RUNTIME_CONFIG_GLOBAL = '__EXAM_APP_CONFIG__'

const getWindowRuntimeConfig = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window[RUNTIME_CONFIG_GLOBAL]

  return value && typeof value === 'object' ? value : null
}

export const getRuntimeConfigOverride = () => {
  const windowConfig = getWindowRuntimeConfig()

  if (!windowConfig) {
    return {
      loadedAt: null,
      override: {},
      source: 'static',
    }
  }

  return {
    loadedAt: new Date().toISOString(),
    override: windowConfig,
    source: `window.${RUNTIME_CONFIG_GLOBAL}`,
  }
}

// TODO backend: load remote runtime config from config.runtime.remoteConfigUrl
// before rendering, then merge it through ConfigService. Keep secrets server-side.
