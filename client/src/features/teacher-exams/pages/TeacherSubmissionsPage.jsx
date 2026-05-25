import { useEffect, useState } from 'react'
import { listTeacherSubmissions } from '../../../api/teacherService'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import {
  TEACHER_SUBMISSION_STATUSES,
} from '../../../models/teacherModels'
import { buildTeacherSubmissionPath, useRouter } from '../../../routing/router'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { TeacherSubmissionStatusBadge } from '../components/TeacherStatusBadge'

const submissionStatusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: TEACHER_SUBMISSION_STATUSES.submitted },
  { label: 'In Review', value: TEACHER_SUBMISSION_STATUSES.grading },
  { label: 'Graded', value: TEACHER_SUBMISSION_STATUSES.graded },
  { label: 'Published', value: TEACHER_SUBMISSION_STATUSES.published },
]

export function TeacherSubmissionsPage() {
  const { navigate } = useRouter()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    let isActive = true

    const loadSubmissions = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await listTeacherSubmissions({ page: 1, search, status })

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

    loadSubmissions()

    return () => {
      isActive = false
    }
  }, [search, status])

  const submissions = data?.items ?? []

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Submission Review</p>
          <h1>Grading Queue</h1>
          <p className="text-secondary mb-0">
            Review submitted attempts, override grades, and publish feedback.
          </p>
        </div>
      </div>

      <section className="app-panel p-3 p-md-4">
        <div className="dashboard-controls">
          <div className="filter-tabs" role="tablist" aria-label="Submission status filter">
            {submissionStatusOptions.map((option) => (
              <button
                aria-selected={status === option.value}
                className={status === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setStatus(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            className="form-control"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, exam, or submission"
            type="search"
            value={search}
          />
        </div>

        {loading && <LoadingState label="Loading submissions" rows={5} />}
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && submissions.length === 0 && (
          <EmptyState
            description="No submissions match the current filters."
            title="No submissions found"
          />
        )}
        {!loading && !error && submissions.length > 0 && (
          <div className="table-responsive management-table">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Duration</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <div className="table-title">{submission.studentName}</div>
                      <div className="text-secondary small">{submission.id}</div>
                    </td>
                    <td>{submission.examTitle}</td>
                    <td>
                      <TeacherSubmissionStatusBadge status={submission.status} />
                    </td>
                    <td>{formatDateTime(submission.submittedAt)}</td>
                    <td>{formatDuration(submission.durationMinutes)}</td>
                    <td>
                      <strong>{submission.percentage}%</strong>
                      <span className="text-secondary small d-block">
                        {submission.score} / {submission.maxScore}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(buildTeacherSubmissionPath(submission.id))}
                        type="button"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
