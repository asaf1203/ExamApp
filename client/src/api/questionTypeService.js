import { ApiError, apiClient, mockRequest } from './apiClient'
import { TEACHER_QUESTION_TYPE_CONFIG } from '../models/teacherModels'

const QUESTION_TYPE_SETTINGS_KEY = 'examPlatform.teacher.questionTypes'
const DEFAULT_POINTS = 10
let fallbackQuestionTypeSettings = {}

const clone = (value) => structuredClone(value)

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storage = window.localStorage

    return storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
      ? storage
      : null
  } catch {
    return null
  }
}

const readStoredSettings = () => {
  const storage = getStorage()

  if (!storage) {
    return fallbackQuestionTypeSettings
  }

  try {
    const rawValue = storage.getItem(QUESTION_TYPE_SETTINGS_KEY)
    return rawValue ? JSON.parse(rawValue) : {}
  } catch {
    return {}
  }
}

const persistStoredSettings = (settings) => {
  const storage = getStorage()

  if (!storage) {
    fallbackQuestionTypeSettings = clone(settings)
    return
  }

  storage.setItem(QUESTION_TYPE_SETTINGS_KEY, JSON.stringify(settings))
}

const clearStoredSettings = () => {
  const storage = getStorage()

  fallbackQuestionTypeSettings = {}

  if (storage) {
    storage.removeItem(QUESTION_TYPE_SETTINGS_KEY)
  }
}

export const buildDefaultQuestionTypes = () =>
  Object.entries(TEACHER_QUESTION_TYPE_CONFIG).map(([type, config]) => ({
    ...config,
    defaultPoints: DEFAULT_POINTS,
    enabled: true,
    type,
  }))

const normalizeSettingsByType = (settingsByType = {}) => {
  const normalized = {}

  buildDefaultQuestionTypes().forEach((questionType) => {
    const stored = settingsByType[questionType.type] ?? {}
    normalized[questionType.type] = {
      defaultPoints: Math.max(1, Number(stored.defaultPoints ?? questionType.defaultPoints)),
      enabled:
        stored.enabled === undefined ? questionType.enabled : Boolean(stored.enabled),
    }
  })

  return normalized
}

const mergeQuestionTypeSettings = (settingsByType = {}) => {
  const normalized = normalizeSettingsByType(settingsByType)

  return buildDefaultQuestionTypes().map((questionType) => ({
    ...questionType,
    ...normalized[questionType.type],
  }))
}

const assertValidSettings = (questionTypes) => {
  if (!questionTypes.some((questionType) => questionType.enabled)) {
    throw new ApiError('At least one question type must stay enabled.', {
      code: 'QUESTION_TYPE_VALIDATION_ERROR',
      status: 400,
    })
  }
}

const listTeacherQuestionTypesMock = () =>
  mockRequest(() => mergeQuestionTypeSettings(readStoredSettings()))

const saveTeacherQuestionTypesMock = (questionTypes = []) =>
  mockRequest(() => {
    const supportedTypes = new Set(Object.keys(TEACHER_QUESTION_TYPE_CONFIG))
    const settings = {}

    questionTypes.forEach((questionType) => {
      if (!supportedTypes.has(questionType.type)) {
        return
      }

      settings[questionType.type] = {
        defaultPoints: Math.max(1, Number(questionType.defaultPoints || DEFAULT_POINTS)),
        enabled: Boolean(questionType.enabled),
      }
    })

    const merged = mergeQuestionTypeSettings(settings)
    assertValidSettings(merged)
    persistStoredSettings(normalizeSettingsByType(settings))

    return merged
  })

const resetTeacherQuestionTypesMock = () =>
  mockRequest(() => {
    clearStoredSettings()
    return buildDefaultQuestionTypes()
  })

export const listTeacherQuestionTypes = async () =>
  apiClient.isMock
    ? listTeacherQuestionTypesMock()
    : apiClient.get('/teacher/question-types')

export const saveTeacherQuestionTypes = async (questionTypes) =>
  apiClient.isMock
    ? saveTeacherQuestionTypesMock(questionTypes)
    : apiClient.put('/teacher/question-types', { questionTypes })

export const resetTeacherQuestionTypes = async () =>
  apiClient.isMock
    ? resetTeacherQuestionTypesMock()
    : apiClient.post('/teacher/question-types/reset')

export const getEnabledQuestionTypes = (questionTypes = []) =>
  questionTypes.filter((questionType) => questionType.enabled).map(clone)

export { QUESTION_TYPE_SETTINGS_KEY }
