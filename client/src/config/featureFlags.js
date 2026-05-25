import { configService } from './configService'

export const featureFlags = Object.freeze({
  isEnabled(flagName) {
    return configService.isFeatureEnabled(flagName)
  },
  require(flagName) {
    if (!configService.isFeatureEnabled(flagName)) {
      throw new Error(`Feature flag "${flagName}" is disabled.`)
    }
  },
})

export const isFeatureEnabled = (flagName) => featureFlags.isEnabled(flagName)
