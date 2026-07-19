import { useState } from 'react'
import { USER_ROLES } from '../api/authService'
import { NotificationCenter } from '../components/NotificationCenter'
import { ThemeToggle } from '../components/ThemeToggle'
import { appConfig } from '../config'
import { useAuth } from '../auth/authState'
import { ROUTES, useRouter } from '../routing/router'

const navItems = [
  {
    label: 'Dashboard',
    path: ROUTES.studentDashboard,
    roles: [USER_ROLES.student],
  },
  {
    label: 'Profile',
    path: ROUTES.studentProfile,
    roles: [USER_ROLES.student],
  },
  {
    label: 'Dashboard',
    path: ROUTES.teacherDashboard,
    roles: [USER_ROLES.teacher],
  },
  {
    label: 'Exams',
    path: ROUTES.teacherExams,
    roles: [USER_ROLES.teacher],
  },
  {
    label: 'Types',
    path: ROUTES.teacherQuestionTypes,
    roles: [USER_ROLES.teacher],
  },
  {
    label: 'Submissions',
    path: ROUTES.teacherSubmissions,
    roles: [USER_ROLES.teacher],
  },
]

export function AppLayout({ children }) {
  const { currentUser, logout } = useAuth()
  const { navigate, path } = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await logout()
      navigate(ROUTES.login, { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const availableNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser.role),
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="container app-container">
          <div className="topbar-grid">
            <button
              className="brand-mark"
              onClick={() =>
                navigate(
                  currentUser.role === USER_ROLES.teacher
                    ? ROUTES.teacherDashboard
                    : ROUTES.studentDashboard,
                )
              }
              type="button"
            >
              <span className="brand-icon" aria-hidden="true">
                ET
              </span>
              <span>
                <span className="brand-name">{appConfig.app.name}</span>
                <span className="brand-subtitle">{appConfig.app.title}</span>
              </span>
            </button>

            <nav aria-label="Primary navigation" className="nav-pills">
              {availableNavItems.map((item) => (
                <button
                  aria-current={path === item.path ? 'page' : undefined}
                  className={`nav-pill ${
                    path === item.path ||
                    (currentUser.role === USER_ROLES.teacher &&
                      item.path !== ROUTES.teacherDashboard &&
                      path.startsWith(item.path))
                      ? 'active'
                      : ''
                  }`}
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="topbar-actions">
              <NotificationCenter refreshKey={path} />
              <ThemeToggle />
              <div className="user-chip">
                <span className="text-capitalize">{currentUser.role}</span>
                <strong>{currentUser.name}</strong>
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
      </header>

      <div className="container app-container py-4 py-lg-5">{children}</div>
    </main>
  )
}
