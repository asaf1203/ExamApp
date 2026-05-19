import { useState } from 'react'
import { USER_ROLES } from '../api/authService'
import { useAuth } from './authState'

const emptyForm = {
  email: '',
  name: '',
  password: '',
  role: USER_ROLES.student,
}

function AuthScreen() {
  const { authError, clearAuthError, login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  const updateField = (field, value) => {
    clearAuthError()
    setForm((current) => ({ ...current, [field]: value }))
  }

  const switchMode = (nextMode) => {
    clearAuthError()
    setMode(nextMode)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      if (isSignup) {
        await signup(form)
      } else {
        await login({ email: form.email, password: form.password })
      }
    } catch {
      // AuthContext owns the user-facing error message.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-6">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="mb-4">
              <p className="text-uppercase text-primary fw-semibold small mb-1">
                E-Test System
              </p>
              <h1 className="h3 mb-1">{isSignup ? 'Create Account' : 'Sign In'}</h1>
              <p className="text-secondary mb-0">
                Use a teacher or student account to continue.
              </p>
            </div>

            <div className="btn-group w-100 mb-4" role="group" aria-label="Auth mode">
              <button
                className={`btn ${!isSignup ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => switchMode('login')}
                type="button"
              >
                Login
              </button>
              <button
                className={`btn ${isSignup ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => switchMode('signup')}
                type="button"
              >
                Sign up
              </button>
            </div>

            <form className="vstack gap-3" onSubmit={handleSubmit}>
              {isSignup && (
                <>
                  <div>
                    <label className="form-label" htmlFor="name">
                      Name
                    </label>
                    <input
                      autoComplete="name"
                      className="form-control"
                      id="name"
                      onChange={(event) => updateField('name', event.target.value)}
                      type="text"
                      value={form.name}
                    />
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
                  className="form-control"
                  id="email"
                  onChange={(event) => updateField('email', event.target.value)}
                  type="email"
                  value={form.email}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className="form-control"
                  id="password"
                  onChange={(event) => updateField('password', event.target.value)}
                  type="password"
                  value={form.password}
                />
              </div>

              {authError && (
                <div className="alert alert-danger mb-0" role="alert">
                  {authError}
                </div>
              )}

              <button className="btn btn-primary" disabled={submitting} type="submit">
                {submitting
                  ? isSignup
                    ? 'Creating...'
                    : 'Signing in...'
                  : isSignup
                    ? 'Create account'
                    : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthScreen
