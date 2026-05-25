import { useCallback, useEffect, useState } from 'react'
import { listStudentExams } from '../../../api/examService'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import { StatusBadge } from '../../../components/StatusBadge'
import {
  DASHBOARD_FILTERS,
  EXAM_STATUSES,
  STATUS_FILTER_OPTIONS,
} from '../../../models/examModels'
import {
  buildExamInstructionsPath,
  buildExamTakingPath,
  buildResultsPath,
  useRouter,
} from '../../../routing/router'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'

const groupOptions = [
  { label: 'All', value: DASHBOARD_FILTERS.all },
  { label: 'Available', value: DASHBOARD_FILTERS.available },
  { label: 'Upcoming', value: DASHBOARD_FILTERS.upcoming },
  { label: 'Completed', value: DASHBOARD_FILTERS.completed },
]

function SummaryCard({ label, value, detail }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

function ExamAction({ exam }) {
  const { navigate } = useRouter()

  if (exam.canContinue && exam.latestAttemptId) {
    return (
      <button
        className="btn btn-primary"
        onClick={() => navigate(buildExamTakingPath(exam.examId, exam.latestAttemptId))}
        type="button"
      >
        Continue
      </button>
    )
  }

  if (exam.status === EXAM_STATUSES.graded && exam.latestAttemptId) {
    return (
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(buildResultsPath(exam.latestAttemptId))}
          type="button"
        >
          Results
        </button>
        {exam.canStart && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(buildExamInstructionsPath(exam.examId))}
            type="button"
          >
            Retake
          </button>
        )}
      </div>
    )
  }

  if (exam.status === EXAM_STATUSES.submitted && exam.latestAttemptId) {
    return (
      <button
        className="btn btn-outline-primary"
        onClick={() => navigate(buildResultsPath(exam.latestAttemptId))}
        type="button"
      >
        View Submission
      </button>
    )
  }

  return (
    <button
      className="btn btn-primary"
      onClick={() => navigate(buildExamInstructionsPath(exam.examId))}
      type="button"
    >
      {exam.upcoming || exam.status === EXAM_STATUSES.expired ? 'Details' : 'Enter Exam'}
    </button>
  )
}

function ExamCard({ exam }) {
  const percentage =
    exam.score && exam.score.maxScore > 0
      ? Math.round((exam.score.score / exam.score.maxScore) * 100)
      : null

  return (
    <article className="exam-card">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <StatusBadge status={exam.status} />
            {exam.upcoming && <span className="status-badge status-badge-info">Upcoming</span>}
            <span className="text-secondary small">{exam.examId}</span>
          </div>
          <h2 className="h5 mb-1">{exam.title}</h2>
          <p className="text-secondary mb-3">{exam.description}</p>
          <div className="exam-meta">
            <span>{exam.subject}</span>
            <span>{formatDuration(exam.durationMinutes)}</span>
            <span>{exam.questionCount} questions</span>
            <span>Due {formatDateTime(exam.dueAt)}</span>
          </div>
        </div>

        <div className="exam-card-aside">
          {percentage !== null && (
            <div className="score-chip">
              <span>Score</span>
              <strong>{percentage}%</strong>
            </div>
          )}
          <ExamAction exam={exam} />
        </div>
      </div>
    </article>
  )
}

export function StudentDashboard() {
  const { navigate } = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [group, setGroup] = useState(DASHBOARD_FILTERS.all)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const debouncedSearch = useDebouncedValue(search, 250)

  const loadExams = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await listStudentExams({
        group,
        page: 1,
        search: debouncedSearch,
        status,
      })

      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, group, status])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await listStudentExams({
          group,
          page: 1,
          search: debouncedSearch,
          status,
        })

        if (isActive) {
          setData(result)
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

    run()

    return () => {
      isActive = false
    }
  }, [debouncedSearch, group, status])

  const exams = data?.items ?? []
  const summary = data?.summary

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Student Dashboard</p>
          <h1>Exams</h1>
          <p className="text-secondary mb-0">
            Track available, upcoming, in-progress, and completed exams.
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate('/student/profile')}
          type="button"
        >
          Profile
        </button>
      </div>

      {summary && (
        <div className="summary-grid">
          <SummaryCard label="Available" value={summary.available} />
          <SummaryCard label="In Progress" value={summary.inProgress} />
          <SummaryCard label="Completed" value={summary.completed} />
          <SummaryCard
            detail={summary.averageScore === null ? 'No grades yet' : 'Average grade'}
            label="Performance"
            value={summary.averageScore === null ? '-' : `${summary.averageScore}%`}
          />
        </div>
      )}

      {summary?.performanceBySubject?.length > 0 && (
        <section className="app-panel p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Performance</h2>
            <span className="text-secondary small">
              {summary.performanceBySubject.length} subject areas
            </span>
          </div>
          <div className="performance-list">
            {summary.performanceBySubject.map((item) => (
              <div className="performance-row" key={item.subject}>
                <div>
                  <strong>{item.subject}</strong>
                  <span>{item.count} graded attempt{item.count === 1 ? '' : 's'}</span>
                </div>
                <div className="progress performance-bar" aria-hidden="true">
                  <div
                    className="progress-bar"
                    style={{ width: `${item.average}%` }}
                  />
                </div>
                <strong>{item.average}%</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="app-panel p-3 p-md-4">
        <div className="dashboard-controls">
          <div className="filter-tabs" role="tablist" aria-label="Exam groups">
            {groupOptions.map((option) => (
              <button
                aria-selected={group === option.value}
                className={group === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setGroup(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="control-row">
            <label className="visually-hidden" htmlFor="examSearch">
              Search exams
            </label>
            <input
              className="form-control"
              id="examSearch"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exams"
              type="search"
              value={search}
            />
            <label className="visually-hidden" htmlFor="statusFilter">
              Filter by status
            </label>
            <select
              className="form-select"
              id="statusFilter"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <LoadingState label="Loading student exams" rows={4} />}

        {error && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            <div className="fw-semibold">Could not load exams</div>
            <div>{error}</div>
            <button
              className="btn btn-sm btn-outline-danger mt-3"
              onClick={loadExams}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <EmptyState
            description="Try changing the search or status filter."
            title="No exams found"
          />
        )}

        {!loading && !error && exams.length > 0 && (
          <div className="exam-list">
            {exams.map((exam) => (
              <ExamCard exam={exam} key={exam.assignmentId} />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
