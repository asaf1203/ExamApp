import { appConfig } from '../config'

const AUTH_TOKEN_KEY = appConfig.auth.tokenStorageKey
const REFRESH_TOKEN_KEY = appConfig.auth.refreshTokenStorageKey

let fallbackToken = ''
let fallbackRefreshToken = ''

const isStorageLike = (storage) =>
  storage &&
  typeof storage.getItem === 'function' &&
  typeof storage.setItem === 'function' &&
  typeof storage.removeItem === 'function'

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return isStorageLike(window.localStorage) ? window.localStorage : null
  } catch {
    return null
  }
}

export const getAuthToken = () => {
  const storage = getStorage()

  return storage ? storage.getItem(AUTH_TOKEN_KEY) : fallbackToken || null
}

export const saveAuthToken = (token) => {
  const storage = getStorage()

  if (storage) {
    storage.setItem(AUTH_TOKEN_KEY, token)
    return
  }

  fallbackToken = token
}

export const getRefreshToken = () => {
  const storage = getStorage()

  return storage ? storage.getItem(REFRESH_TOKEN_KEY) : fallbackRefreshToken || null
}

export const saveRefreshToken = (token) => {
  const storage = getStorage()

  if (storage) {
    storage.setItem(REFRESH_TOKEN_KEY, token)
    return
  }

  fallbackRefreshToken = token
}

export const clearAuthToken = () => {
  const storage = getStorage()

  if (storage) {
    storage.removeItem(AUTH_TOKEN_KEY)
    storage.removeItem(REFRESH_TOKEN_KEY)
    return
  }

  fallbackToken = ''
  fallbackRefreshToken = ''
}

export const authTokenKey = AUTH_TOKEN_KEY
export const refreshTokenKey = REFRESH_TOKEN_KEY
