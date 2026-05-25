/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export const ROUTES = Object.freeze({
  home: '/',
  login: '/login',
  studentDashboard: '/student',
  studentProfile: '/student/profile',
  teacherDashboard: '/teacher',
})

const RouterContext = createContext(null)

export const normalizePath = (path) => {
  const withoutHash = String(path || '/').replace(/^#/, '')
  const withSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  const normalized = withSlash.replace(/\/+$/, '')

  return normalized || '/'
}

const getCurrentPath = () => normalizePath(window.location.hash.replace(/^#/, '') || '/')

export const buildExamInstructionsPath = (examId) =>
  `/student/exams/${encodeURIComponent(examId)}/instructions`

export const buildExamTakingPath = (examId, attemptId) =>
  `/student/exams/${encodeURIComponent(examId)}/take/${encodeURIComponent(attemptId)}`

export const buildResultsPath = (attemptId) =>
  `/student/results/${encodeURIComponent(attemptId)}`

export const matchRoute = (path) => {
  const normalizedPath = normalizePath(path)
  const segments = normalizedPath.split('/').filter(Boolean).map(decodeURIComponent)

  if (segments.length === 0) {
    return { name: 'home', params: {}, path: normalizedPath }
  }

  if (segments[0] === 'login') {
    return { name: 'login', params: {}, path: normalizedPath }
  }

  if (segments[0] === 'teacher' && segments.length === 1) {
    return { name: 'teacherDashboard', params: {}, path: normalizedPath }
  }

  if (segments[0] === 'student') {
    if (segments.length === 1) {
      return { name: 'studentDashboard', params: {}, path: normalizedPath }
    }

    if (segments[1] === 'profile' && segments.length === 2) {
      return { name: 'studentProfile', params: {}, path: normalizedPath }
    }

    if (segments[1] === 'exams' && segments[3] === 'instructions') {
      return {
        name: 'examInstructions',
        params: { examId: segments[2] },
        path: normalizedPath,
      }
    }

    if (segments[1] === 'exams' && segments[3] === 'take') {
      return {
        name: 'examTaking',
        params: { attemptId: segments[4], examId: segments[2] },
        path: normalizedPath,
      }
    }

    if (segments[1] === 'results' && segments[2]) {
      return {
        name: 'examResults',
        params: { attemptId: segments[2] },
        path: normalizedPath,
      }
    }
  }

  return { name: 'notFound', params: {}, path: normalizedPath }
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(getCurrentPath)

  useEffect(() => {
    const syncPath = () => setPath(getCurrentPath())

    window.addEventListener('hashchange', syncPath)
    window.addEventListener('popstate', syncPath)

    return () => {
      window.removeEventListener('hashchange', syncPath)
      window.removeEventListener('popstate', syncPath)
    }
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    const nextPath = normalizePath(to)
    const nextHash = `#${nextPath}`

    if (replace) {
      window.history.replaceState(null, '', nextHash)
    } else {
      window.history.pushState(null, '', nextHash)
    }

    setPath(nextPath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const route = useMemo(() => matchRoute(path), [path])
  const value = useMemo(() => ({ navigate, path, route }), [navigate, path, route])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export const useRouter = () => {
  const context = useContext(RouterContext)

  if (!context) {
    throw new Error('useRouter must be used within RouterProvider.')
  }

  return context
}
