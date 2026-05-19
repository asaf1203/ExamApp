import { useState } from 'react'
import './App.css'
import { USER_ROLES } from './api/authService'
import { AuthProvider } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import { useAuth } from './auth/authState'
import { appConfig } from './config'
import StudentPortal from './StudentPortal'
import TeacherDashboard from './TeacherDashboard'

function AuthenticatedApp() {
  const { currentUser, initializing, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  if (initializing) {
    return (
      <main className="app-shell bg-body-tertiary">
        <div className="container py-4 py-md-5">
          <div className="alert alert-info mb-0" role="status">
            Checking session...
          </div>
        </div>
      </main>
    )
  }

  if (!currentUser) {
    return (
      <main className="app-shell bg-body-tertiary">
        <div className="container py-4 py-md-5">
          <AuthScreen />
        </div>
      </main>
    )
  }

  const isTeacher =
    currentUser.role === USER_ROLES.teacher && appConfig.features.teacherDashboard
  const isStudent =
    currentUser.role === USER_ROLES.student && appConfig.features.studentPortal

  return (
    <main className="app-shell bg-body-tertiary">
      <div className="container py-4 py-md-5">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-start">
              <p className="text-uppercase text-primary fw-semibold small mb-1">
                {appConfig.app.name}
              </p>
              <h1 className="h2 mb-1">{appConfig.app.title}</h1>
              <p className="text-secondary mb-0">{appConfig.app.description}</p>
            </div>

            <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2 text-start text-sm-end">
              <div>
                <span className="badge text-bg-primary text-capitalize mb-1">
                  {currentUser.role}
                </span>
                <div className="fw-semibold">{currentUser.name}</div>
                <div className="text-secondary small">{currentUser.email}</div>
              </div>
              <button
                className="btn btn-outline-primary"
                disabled={loggingOut}
                onClick={handleLogout}
                type="button"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>

        {isTeacher && <TeacherDashboard />}
        {isStudent && <StudentPortal />}
        {!isTeacher && !isStudent && (
          <div className="alert alert-danger" role="alert">
            This role is not enabled in the current configuration.
          </div>
        )}
      </div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}

export default App
