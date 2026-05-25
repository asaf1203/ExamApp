import { isFeatureEnabled } from '../config'

export const useFeatureFlag = (flagName) => isFeatureEnabled(flagName)
