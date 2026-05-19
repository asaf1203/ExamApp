const AUTH_TOKEN_KEY = 'examPlatform.authToken'

let fallbackToken = ''

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

export const clearAuthToken = () => {
  const storage = getStorage()

  if (storage) {
    storage.removeItem(AUTH_TOKEN_KEY)
    return
  }

  fallbackToken = ''
}

export const authTokenKey = AUTH_TOKEN_KEY
