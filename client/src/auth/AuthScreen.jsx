import { useState } from 'react'
import { USER_ROLES, requestPasswordReset } from '../api/authService'
import { appConfig } from '../config'
import { useToast } from '../ui/ToastContext'
import { useAuth } from './authState'

const emptyForm = {
  email: '',
  name: '',
  password: '',
  role: USER_ROLES.student,
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

function AuthScreen() {
  const { authError, clearAuthError, login, signup } = useAuth()
  const { notify } = useToast()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const isSignup = appConfig.features.registration && mode === 'signup'
  const isReset = appConfig.features.passwordReset && mode === 'reset'

  const updateField = (field, value) => {
    clearAuthError()
    setFormErrors((current) => ({ ...current, [field]: '' }))
    setForm((current) => ({ ...current, [field]: value }))
  }

  const switchMode = (nextMode) => {
    clearAuthError()
    setFormErrors({})
    setMode(nextMode)
  }

  const validate = () => {
    const nextErrors = {}

    if (isSignup && !form.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!isReset && form.password.trim().length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      if (isReset) {
        await requestPasswordReset({ email: form.email })
        notify({
          message: 'Password reset request recorded for the mock account.',
          tone: 'success',
        })
        switchMode('login')
      } else if (isSignup) {
        await signup(form)
      } else {
        await login({ email: form.email, password: form.password })
      }
    } catch (err) {
      if (isReset) {
        notify({ message: err.message, tone: 'danger', title: 'Request failed' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">{appConfig.app.name}</p>
          <h1>{isReset ? 'Reset Password' : isSignup ? 'Create Account' : 'Sign In'}</h1>
          <p className="text-secondary">
            Student and teacher roles share the same auth flow while route guards
            decide which screens are available.
          </p>
          <div className="demo-accounts">
            <strong>Demo accounts</strong>
            <span>student@example.com / student123</span>
            <span>teacher@example.com / teacher123</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="filter-tabs mb-4" role="tablist" aria-label="Auth mode">
            <button
              aria-selected={!isSignup && !isReset}
              className={!isSignup && !isReset ? 'active' : ''}
              onClick={() => switchMode('login')}
              role="tab"
              type="button"
            >
              Login
            </button>
            {appConfig.features.registration && (
              <button
                aria-selected={isSignup}
                className={isSignup ? 'active' : ''}
                onClick={() => switchMode('signup')}
                role="tab"
                type="button"
              >
                Sign Up
              </button>
            )}
          </div>

          <form className="vstack gap-3" noValidate onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <div>
                  <label className="form-label" htmlFor="name">
                    Name
                  </label>
                  <input
                    autoComplete="name"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    id="name"
                    onChange={(event) => updateField('name', event.target.value)}
                    type="text"
                    value={form.name}
                  />
                  {formErrors.name && (
                    <div className="invalid-feedback">{formErrors.name}</div>
                  )}
                </div>

                <div>
                  <label className="form-label" htmlFor="role">
                    Role
                  </label>
                  <select
                    className="form-select"
                    id="role"
                    onChange={(event) => updateField('role', event.target.value)}
                    value={form.role}
                  >
                    <option value={USER_ROLES.student}>Student</option>
                    <option value={USER_ROLES.teacher}>Teacher</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                id="email"
                onChange={(event) => updateField('email', event.target.value)}
                type="email"
                value={form.email}
              />
              {formErrors.email && (
                <div className="invalid-feedback">{formErrors.email}</div>
              )}
            </div>

            {!isReset && (
              <div>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                  id="password"
                  onChange={(event) => updateField('password', event.target.value)}
                  type="password"
                  value={form.password}
                />
                {formErrors.password && (
                  <div className="invalid-feedback">{formErrors.password}</div>
                )}
              </div>
            )}

            {authError && (
              <div className="alert alert-danger mb-0" role="alert">
                {authError}
              </div>
            )}

            <button className="btn btn-primary" disabled={submitting} type="submit">
              {submitting
                ? isReset
                  ? 'Requesting...'
                  : isSignup
                    ? 'Creating...'
                    : 'Signing in...'
                : isReset
                  ? 'Request Reset'
                  : isSignup
                    ? 'Create Account'
                    : 'Login'}
            </button>
          </form>

          {appConfig.features.passwordReset && (
            <button
              className="link-button mt-3"
              onClick={() => switchMode(isReset ? 'login' : 'reset')}
              type="button"
            >
              {isReset ? 'Back to login' : 'Forgot password?'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default AuthScreen
