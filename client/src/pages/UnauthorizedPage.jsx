import { USER_ROLES } from '../api/authService'
import { ROUTES, useRouter } from '../routing/router'

export function UnauthorizedPage({ role }) {
  const { navigate } = useRouter()

  return (
    <section className="app-panel p-4">
      <p className="text-uppercase text-danger fw-semibold small mb-2">
        Access Restricted
      </p>
      <h1 className="h4">This page is not available for your role</h1>
      <p className="text-secondary">
        Protected routes are checked on the client now and should be enforced by
        backend authorization later.
      </p>
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
