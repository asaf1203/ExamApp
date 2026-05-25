import { appConfig } from '../config'
import { getAuthToken } from './authTokenStorage'

export const MOCK_API_DELAY_MS = appConfig.api.mockDelayMs

const clone = (value) => structuredClone(value)

export class ApiError extends Error {
  constructor(
    message,
    { status = 500, code = 'API_ERROR', details = null, cause = undefined } = {},
  ) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const createApiResponse = (
  data,
  { status = 200, headers = {}, meta = null } = {},
) => ({
  data,
  headers,
  meta,
  ok: status >= 200 && status < 300,
  status,
})

const normalizeApiError = (error) => {
  if (error instanceof ApiError) {
    return error
  }

  return new ApiError(error?.message || 'Unexpected request error.', {
    code: error?.code || 'UNEXPECTED_ERROR',
    details: error?.details ?? null,
    status: error?.status || 500,
  })
}

const requestInterceptors = []
const responseInterceptors = []
const responseCache = new Map()

export const apiCache = Object.freeze({
  clear() {
    responseCache.clear()
  },
  delete(key) {
    responseCache.delete(key)
  },
  get(key) {
    const cached = responseCache.get(key)

    if (!cached) {
      return undefined
    }

    if (cached.expiresAt <= Date.now()) {
      responseCache.delete(key)
      return undefined
    }

    return clone(cached.value)
  },
  set(key, value, ttlMs = 30000) {
    responseCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value: clone(value),
    })
  },
})

export const apiInterceptors = Object.freeze({
  request: Object.freeze({
    use(handler) {
      requestInterceptors.push(handler)
      return () => {
        const index = requestInterceptors.indexOf(handler)
        if (index >= 0) {
          requestInterceptors.splice(index, 1)
        }
      }
    },
  }),
  response: Object.freeze({
    use(handler) {
      responseInterceptors.push(handler)
      return () => {
        const index = responseInterceptors.indexOf(handler)
        if (index >= 0) {
          responseInterceptors.splice(index, 1)
        }
      }
    },
  }),
})

const runRequestInterceptors = async (request) => {
  let nextRequest = request

  for (const interceptor of requestInterceptors) {
    nextRequest = (await interceptor(nextRequest)) ?? nextRequest
  }

  return nextRequest
}

const runResponseInterceptors = async (response) => {
  let nextResponse = response

  for (const interceptor of responseInterceptors) {
    nextResponse = (await interceptor(nextResponse)) ?? nextResponse
  }

  return nextResponse
}

const shouldRetry = (error, attempt) =>
  attempt < appConfig.api.retryCount &&
  (!error.status || error.status >= 500 || error.status === 408)

/**
 * Mock transport used by the current in-memory services. Keeping it next to the
 * HTTP transport gives service modules one API-client boundary to depend on.
 */
export const mockRequest = (handler, options = {}) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (
          appConfig.api.mockErrorRate > 0 &&
          !options.skipErrorSimulation &&
          Math.random() < appConfig.api.mockErrorRate
        ) {
          throw new ApiError('Temporary mock API failure. Please retry.', {
            code: 'MOCK_NETWORK_ERROR',
            status: 503,
          })
        }

        const response = createApiResponse(handler(), {
          meta: options.meta ?? null,
          status: options.status ?? 200,
        })

        resolve(clone(response.data))
      } catch (error) {
        reject(normalizeApiError(error))
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

    throw new ApiError(message, {
      code:
        typeof payload === 'object' && payload?.code
          ? payload.code
          : 'HTTP_REQUEST_FAILED',
      details: typeof payload === 'object' ? payload?.details ?? null : null,
      status: response.status,
    })
  }

  return payload
}

export const httpRequest = async (path, options = {}) => {
  const { cacheKey, cacheTtlMs, ...requestOptions } = options
  const isCacheable = requestOptions.method === 'GET' && cacheKey
  const cachedResponse = isCacheable ? apiCache.get(cacheKey) : undefined

  if (cachedResponse !== undefined) {
    return cachedResponse
  }

  const token = getAuthToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...requestOptions.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), appConfig.api.timeoutMs)

  const request = await runRequestInterceptors({
    path,
    options: {
      ...requestOptions,
      body:
        requestOptions.body && typeof requestOptions.body !== 'string'
          ? JSON.stringify(requestOptions.body)
          : requestOptions.body,
      headers,
    },
  })

  let attempt = 0

  try {
    while (true) {
      try {
        const response = await fetch(buildUrl(request.path), {
          ...request.options,
          signal: controller.signal,
        })

        const payload = await parseResponse(response)
        const nextPayload = await runResponseInterceptors(payload)

        if (isCacheable) {
          apiCache.set(cacheKey, nextPayload, cacheTtlMs)
        }

        return nextPayload
      } catch (error) {
        const normalizedError =
          error.name === 'AbortError'
            ? new ApiError('Request timed out.', {
                cause: error,
                code: 'REQUEST_TIMEOUT',
                status: 408,
              })
            : normalizeApiError(error)

        if (shouldRetry(normalizedError, attempt)) {
          attempt += 1
          continue
        }

        throw normalizedError
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export const httpRequestWithoutRetry = async (path, options = {}) => {
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
      throw new ApiError('Request timed out.', {
        cause: error,
        code: 'REQUEST_TIMEOUT',
        status: 408,
      })
    }

    throw normalizeApiError(error)
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
