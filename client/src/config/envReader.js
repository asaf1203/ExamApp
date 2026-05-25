import { API_BACKENDS, APP_ENVIRONMENTS, LOG_LEVELS } from './configModels'

const rawEnv = import.meta.env ?? {}
const truthyValues = ['true', '1', 'yes', 'on']
const falseyValues = ['false', '0', 'no', 'off']

export const readString = (key, fallback = '') => {
  const value = rawEnv[key]

  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export const readNumber = (key, fallback) => {
  const rawValue = readString(key)

  if (!rawValue) {
    return fallback
  }

  const value = Number(rawValue)

  return Number.isFinite(value) ? value : fallback
}

export const readBoolean = (key, fallback) => {
  const value = readString(key).toLowerCase()

  if (truthyValues.includes(value)) {
    return true
  }

  if (falseyValues.includes(value)) {
    return false
  }

  return fallback
}

export const readEnum = (key, allowedValues, fallback) => {
  const value = readString(key, fallback ?? '').toLowerCase()

  return allowedValues.includes(value) ? value : fallback
}

export const readJson = (key, fallback) => {
  const value = readString(key)

  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const normalizeBaseUrl = (url) => {
  const value = String(url ?? '').trim()

  if (!value || value === '/') {
    return ''
  }

  return value.replace(/\/+$/, '')
}

export const readEnvironmentName = () =>
  readEnum('VITE_APP_ENV', Object.values(APP_ENVIRONMENTS), null) ??
  readEnum('MODE', Object.values(APP_ENVIRONMENTS), APP_ENVIRONMENTS.development)

export const readApiBackend = () =>
  readEnum(
    'VITE_API_BACKEND',
    Object.values(API_BACKENDS),
    readEnum('VITE_API_DATA_SOURCE', Object.values(API_BACKENDS), API_BACKENDS.mock),
  )

export const readLogLevel = () =>
  readEnum('VITE_LOG_LEVEL', Object.values(LOG_LEVELS), LOG_LEVELS.info)
