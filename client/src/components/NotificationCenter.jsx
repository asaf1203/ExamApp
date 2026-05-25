import { useEffect, useRef, useState } from 'react'
import {
  listNotifications,
  markNotificationsRead,
} from '../api/notificationService'
import { appConfig, isFeatureEnabled } from '../config'
import { formatDateTime } from '../utils/dateTime'

export function NotificationCenter({ refreshKey }) {
  const [data, setData] = useState({ items: [], unreadCount: 0 })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isFeatureEnabled('notifications')) {
      return undefined
    }

    let isActive = true

    const load = async () => {
      try {
        setError('')
        const result = await listNotifications()

        if (isActive) {
          setData(result)
        }
      } catch (err) {
        if (isActive) {
          setError(err.message)
        }
      }
    }

    load()
    const intervalId = window.setInterval(load, appConfig.ui.notificationPollMs)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [refreshKey])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  if (!isFeatureEnabled('notifications')) {
    return null
  }

  const toggleOpen = async () => {
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen && data.unreadCount > 0) {
      try {
        await markNotificationsRead()
        setData((current) => ({
          ...current,
          items: current.items.map((item) => ({
            ...item,
            readAt: item.readAt ?? new Date().toISOString(),
          })),
          unreadCount: 0,
        }))
      } catch {
        // Reading notifications is best-effort in the mock environment.
      }
    }
  }

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        aria-expanded={open}
        aria-label="Notifications"
        className="btn btn-icon notification-button"
        onClick={toggleOpen}
        type="button"
      >
        Alerts
        {data.unreadCount > 0 && (
          <span className="notification-count">{data.unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notification-popover" role="status">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>Notifications</strong>
            <span className="text-secondary small">{data.items.length}</span>
          </div>
          {error && <p className="text-secondary small mb-0">{error}</p>}
          {!error && data.items.length === 0 && (
            <p className="text-secondary small mb-0">No notifications yet.</p>
          )}
          {!error && data.items.length > 0 && (
            <div className="notification-list">
              {data.items.map((item) => (
                <article className="notification-item" key={item.id}>
                  <strong>{item.message}</strong>
                  <span>{formatDateTime(item.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
