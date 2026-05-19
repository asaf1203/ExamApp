import { appConfig } from '../config'
import { getAuthToken } from './authTokenStorage'

export const MOCK_API_DELAY_MS = appConfig.api.mockDelayMs

const clone = (value) => structuredClone(value)

/**
 * Mock transport used by the current in-memory services. Keeping it next to the
 * HTTP transport gives service modules one API-client boundary to depend on.
 */
export const mockRequest = (handler) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(clone(handler()))
      } catch (error) {
        reject(error)
      }
    }, appConfig.api.mockDelayMs)
  })

const buildUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${appConfig.api.baseUrl}${normalizedPath}`
}

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload?.message
        ? payload.message
        : `Request failed with status ${response.status}.`

    throw new Error(message)
  }

  return payload
}

export const httpRequest = async (path, options = {}) => {
  const token = getAuthToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), appConfig.api.timeoutMs)

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      body:
        options.body && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : options.body,
      headers,
      signal: controller.signal,
    })

    return parseResponse(response)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out.', { cause: error })
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiClient = Object.freeze({
  baseUrl: appConfig.api.baseUrl,
  dataSource: appConfig.api.dataSource,
  isMock: appConfig.api.isMock,
  mockRequest,
  get: (path, options) => httpRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    httpRequest(path, { ...options, body, method: 'POST' }),
  put: (path, body, options) => httpRequest(path, { ...options, body, method: 'PUT' }),
  del: (path, options) => httpRequest(path, { ...options, method: 'DELETE' }),
})
