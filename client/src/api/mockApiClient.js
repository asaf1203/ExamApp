/**
 * Shared mock transport. Service modules use this boundary today so a real
 * HTTP client can replace it later without changing UI components.
 */
export const MOCK_API_DELAY_MS = 450

const clone = (value) => structuredClone(value)

export const simulateRequest = (handler) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(clone(handler()))
      } catch (error) {
        reject(error)
      }
    }, MOCK_API_DELAY_MS)
  })
