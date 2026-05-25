import { USER_ROLES } from '../api/authService'
import { ROUTES, useRouter } from '../routing/router'

export function NotFoundPage({ role }) {
  const { navigate } = useRouter()

  return (
    <section className="app-panel p-4">
      <p className="text-uppercase text-secondary fw-semibold small mb-2">
        Not Found
      </p>
      <h1 className="h4">Page not found</h1>
      <p className="text-secondary">The requested route does not exist.</p>
      <button
        className="btn btn-primary"
        onClick={() =>
          navigate(
            role === USER_ROLES.teacher ? ROUTES.teacherDashboard : ROUTES.studentDashboard,
          )
        }
        type="button"
      >
        Return Home
      </button>
    </section>
  )
}
