/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timerId = timersRef.current.get(id)

    if (timerId) {
      window.clearTimeout(timerId)
      timersRef.current.delete(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    ({ message, tone = 'info', title = '' }) => {
      const id =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const toast = { id, message, title, tone }

      setToasts((current) => [...current, toast])
      const timerId = window.setTimeout(() => dismissToast(id), 4500)
      timersRef.current.set(id, timerId)

      return id
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      dismissToast,
      notify,
    }),
    [dismissToast, notify],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="toast-region"
      >
        {toasts.map((toast) => (
          <div
            className={`app-toast app-toast-${toast.tone}`}
            key={toast.id}
            role={toast.tone === 'danger' ? 'alert' : 'status'}
          >
            <div>
              {toast.title && <div className="fw-semibold">{toast.title}</div>}
              <div>{toast.message}</div>
            </div>
            <button
              aria-label="Dismiss notification"
              className="btn-close"
              onClick={() => dismissToast(toast.id)}
              type="button"
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.')
  }

  return context
}
