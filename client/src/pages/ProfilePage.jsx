import { useEffect, useState } from 'react'
import { requestPasswordReset } from '../api/authService'
import { getStudentActivity } from '../api/examService'
import { LoadingState } from '../components/LoadingState'
import { appConfig } from '../config'
import { useAuth } from '../auth/authState'
import { useToast } from '../ui/ToastContext'
import { formatDateTime } from '../utils/dateTime'

export function ProfilePage() {
  const { currentUser } = useAuth()
  const { notify } = useToast()
  const [activity, setActivity] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadActivity = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getStudentActivity()

        if (isActive) {
          setActivity(result)
        }
      } catch (err) {
        if (isActive) {
          setError(err.message)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadActivity()

    return () => {
      isActive = false
    }
  }, [])

  const handlePasswordReset = async () => {
    try {
      setResetLoading(true)
      await requestPasswordReset({ email: currentUser.email })
      notify({
        message: 'Password reset request recorded for this mock account.',
        tone: 'success',
      })
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Request failed' })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{currentUser.name}</h1>
          <p className="text-secondary mb-0">{currentUser.email}</p>
        </div>
        <span className="status-badge status-badge-info text-capitalize">
          {currentUser.role}
        </span>
      </div>

      <section className="profile-grid">
        <article className="app-panel p-3 p-md-4">
          <h2 className="h5 mb-3">Account</h2>
          <dl className="detail-list">
            <div>
              <dt>User ID</dt>
              <dd>{currentUser.id}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(currentUser.createdAt)}</dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>{formatDateTime(currentUser.lastLoginAt)}</dd>
            </div>
          </dl>
          {appConfig.features.passwordReset && (
            <button
              className="btn btn-outline-primary mt-3"
              disabled={resetLoading}
              onClick={handlePasswordReset}
              type="button"
            >
              {resetLoading ? 'Requesting...' : 'Request Password Reset'}
            </button>
          )}
        </article>

        <article className="app-panel p-3 p-md-4">
          <h2 className="h5 mb-3">Session</h2>
          <p className="text-secondary">
            This mock session uses local browser storage for access and refresh
            tokens.
          </p>
          <p className="text-secondary mb-0">
            Backend integration should validate these server-side with JWT
            middleware.
          </p>
        </article>
      </section>

      <section className="app-panel p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Activity Log</h2>
          <span className="text-secondary small">{activity.length} events</span>
        </div>
        {loading && <LoadingState label="Loading activity" rows={3} />}
        {error && (
          <div className="alert alert-danger mb-0" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && activity.length === 0 && (
          <p className="text-secondary mb-0">No exam activity yet.</p>
        )}
        {!loading && !error && activity.length > 0 && (
          <div className="activity-list">
            {activity.slice(0, 20).map((item) => (
              <article className="activity-item" key={item.id}>
                <div>
                  <strong>{item.message}</strong>
                  <span>
                    {item.examTitle} · {item.type}
                  </span>
                </div>
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
