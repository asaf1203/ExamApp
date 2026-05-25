import { useEffect } from 'react'
import './App.css'
import { USER_ROLES } from './api/authService'
import { AuthProvider } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import { useAuth } from './auth/authState'
import { appConfig } from './config'
import { StudentDashboard } from './features/student-exams/pages/StudentDashboard'
import { ExamInstructionsPage } from './features/student-exams/pages/ExamInstructionsPage'
import { ExamTakingPage } from './features/student-exams/pages/ExamTakingPage'
import { ResultsPage } from './features/student-exams/pages/ResultsPage'
import { TeacherDashboardPage } from './features/teacher-exams/pages/TeacherDashboardPage'
import { TeacherExamEditorPage } from './features/teacher-exams/pages/TeacherExamEditorPage'
import { TeacherExamListPage } from './features/teacher-exams/pages/TeacherExamListPage'
import { TeacherExamPreviewPage } from './features/teacher-exams/pages/TeacherExamPreviewPage'
import { TeacherSubmissionReviewPage } from './features/teacher-exams/pages/TeacherSubmissionReviewPage'
import { TeacherSubmissionsPage } from './features/teacher-exams/pages/TeacherSubmissionsPage'
import { AppLayout } from './layout/AppLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import {
  ROUTES,
  RouterProvider,
  useRouter,
} from './routing/router'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { ThemeProvider } from './ui/ThemeContext'
import { ToastProvider } from './ui/ToastContext'

const studentRouteNames = new Set([
  'studentDashboard',
  'studentProfile',
  'examInstructions',
  'examTaking',
  'examResults',
])
const teacherRouteNames = new Set([
  'teacherDashboard',
  'teacherExams',
  'teacherExamCreate',
  'teacherExamEdit',
  'teacherExamPreview',
  'teacherSubmissions',
  'teacherSubmissionReview',
])

const defaultPathForRole = (role) =>
  role === USER_ROLES.teacher ? ROUTES.teacherDashboard : ROUTES.studentDashboard

function FullPageLoading() {
  return (
    <main className="app-shell">
      <div className="container app-container py-5">
        <div className="app-panel p-4" role="status">
          Checking session...
        </div>
      </div>
    </main>
  )
}

function isRouteAllowed(routeName, role) {
  if (studentRouteNames.has(routeName)) {
    return role === USER_ROLES.student
  }

  if (teacherRouteNames.has(routeName)) {
    return role === USER_ROLES.teacher
  }

  return true
}

function RouteSwitch() {
  const { currentUser } = useAuth()
  const { route } = useRouter()

  if (!isRouteAllowed(route.name, currentUser.role)) {
    return <UnauthorizedPage role={currentUser.role} />
  }

  if (
    studentRouteNames.has(route.name) &&
    !appConfig.features.studentPortal
  ) {
    return (
      <div className="alert alert-danger" role="alert">
        Student portal is disabled in the current configuration.
      </div>
    )
  }

  if (
    teacherRouteNames.has(route.name) &&
    !appConfig.features.teacherDashboard
  ) {
    return (
      <div className="alert alert-danger" role="alert">
        Teacher dashboard is disabled in the current configuration.
      </div>
    )
  }

  switch (route.name) {
    case 'studentDashboard':
      return <StudentDashboard />
    case 'studentProfile':
      return <ProfilePage />
    case 'examInstructions':
      return <ExamInstructionsPage examId={route.params.examId} />
    case 'examTaking':
      return (
        <ExamTakingPage
          attemptId={route.params.attemptId}
          examId={route.params.examId}
        />
      )
    case 'examResults':
      return <ResultsPage attemptId={route.params.attemptId} />
    case 'teacherDashboard':
      return <TeacherDashboardPage />
    case 'teacherExams':
      return <TeacherExamListPage />
    case 'teacherExamCreate':
      return <TeacherExamEditorPage mode="create" />
    case 'teacherExamEdit':
      return <TeacherExamEditorPage examId={route.params.examId} />
    case 'teacherExamPreview':
      return <TeacherExamPreviewPage examId={route.params.examId} />
    case 'teacherSubmissions':
      return <TeacherSubmissionsPage />
    case 'teacherSubmissionReview':
      return <TeacherSubmissionReviewPage submissionId={route.params.submissionId} />
    case 'home':
    case 'login':
      return null
    default:
      return <NotFoundPage role={currentUser.role} />
  }
}

function AuthenticatedApp() {
  const { currentUser, initializing } = useAuth()
  const { navigate, route } = useRouter()

  useEffect(() => {
    if (initializing || !currentUser) {
      return
    }

    if (route.name === 'home' || route.name === 'login') {
      navigate(defaultPathForRole(currentUser.role), { replace: true })
    }
  }, [currentUser, initializing, navigate, route.name])

  if (initializing) {
    return <FullPageLoading />
  }

  if (!currentUser) {
    return <AuthScreen />
  }

  return (
    <AppLayout>
      <RouteSwitch />
    </AppLayout>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider>
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          </RouterProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
