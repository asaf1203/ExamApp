import { useCallback, useEffect, useState } from 'react'
import {
  archiveTeacherExam,
  deleteTeacherExam,
  duplicateTeacherExam,
  listTeacherDashboard,
  publishTeacherExam,
  unpublishTeacherExam,
} from '../../../api/teacherService'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import { ROUTES, buildTeacherExamEditorPath, useRouter } from '../../../routing/router'
import { useToast } from '../../../ui/ToastContext'
import { formatDateTime } from '../../../utils/dateTime'
import { TeacherExamTable } from '../components/TeacherExamTable'
import { TeacherSubmissionStatusBadge } from '../components/TeacherStatusBadge'

function StatCard({ detail, label, value }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

export function TeacherDashboardPage() {
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [confirmAction, setConfirmAction] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await listTeacherDashboard({ search })
      setDashboard(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await listTeacherDashboard({ search })

        if (isActive) {
          setDashboard(result)
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
  }, [search])

  const runExamAction = async (action, examId) => {
    try {
      if (action === 'publish') {
        await publishTeacherExam(examId)
      }

      if (action === 'unpublish') {
        await unpublishTeacherExam(examId)
      }

      if (action === 'archive') {
        await archiveTeacherExam(examId)
      }

      if (action === 'delete') {
        await deleteTeacherExam(examId)
      }

      if (action === 'duplicate') {
        const duplicatedExam = await duplicateTeacherExam(examId)
        notify({ message: 'Exam duplicated.', tone: 'success' })
        navigate(buildTeacherExamEditorPath(duplicatedExam.id))
        return
      }

      notify({ message: 'Exam updated.', tone: 'success' })
      await loadDashboard()
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Action failed' })
    } finally {
      setConfirmAction(null)
    }
  }

  const exams = dashboard?.exams?.slice(0, 6) ?? []
  const stats = dashboard?.stats

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Teacher Dashboard</p>
          <h1>Exam Management</h1>
          <p className="text-secondary mb-0">
            Manage drafts, publishing, submissions, and grading from one workspace.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(ROUTES.teacherSubmissions)}
            type="button"
          >
            Review Submissions
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate(ROUTES.teacherExamCreate)}
            type="button"
          >
            Create Exam
          </button>
        </div>
      </div>

      {stats && (
        <div className="summary-grid">
          <StatCard label="Total Exams" value={stats.totalExams} />
          <StatCard label="Published" value={stats.publishedExams} />
          <StatCard label="Drafts" value={stats.draftExams} />
          <StatCard detail="Needs review" label="Pending Grading" value={stats.pendingGrading} />
          <StatCard label="Submissions" value={stats.totalSubmissions} />
          <StatCard label="Archived" value={stats.archivedExams} />
        </div>
      )}

      <section className="teacher-dashboard-grid">
        <article className="app-panel p-3 p-md-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">Recent Exams</h2>
              <p className="text-secondary mb-0">Search, publish, duplicate, or edit.</p>
            </div>
            <div className="control-row compact-control-row">
              <input
                className="form-control"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recent exams"
                type="search"
                value={search}
              />
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate(ROUTES.teacherExams)}
                type="button"
              >
                All Exams
              </button>
            </div>
          </div>

          {loading && <LoadingState label="Loading teacher dashboard" rows={4} />}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && exams.length === 0 && (
            <EmptyState
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(ROUTES.teacherExamCreate)}
                  type="button"
                >
                  Create Exam
                </button>
              }
              description="Create your first teacher-managed exam."
              title="No exams found"
            />
          )}
          {!loading && !error && exams.length > 0 && (
            <TeacherExamTable
              exams={exams}
              onArchive={(examId) => setConfirmAction({ action: 'archive', examId })}
              onDelete={(examId) => setConfirmAction({ action: 'delete', examId })}
              onDuplicate={(examId) => runExamAction('duplicate', examId)}
              onPublish={(examId) => setConfirmAction({ action: 'publish', examId })}
              onUnpublish={(examId) => setConfirmAction({ action: 'unpublish', examId })}
            />
          )}
        </article>

        <aside className="page-stack">
          <article className="app-panel p-3 p-md-4">
            <h2 className="h5 mb-3">Quick Actions</h2>
            <div className="d-grid gap-2">
              <button
                className="btn btn-primary"
                onClick={() => navigate(ROUTES.teacherExamCreate)}
                type="button"
              >
                New Blank Exam
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate(ROUTES.teacherExams)}
                type="button"
              >
                Manage Drafts
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate(ROUTES.teacherSubmissions)}
                type="button"
              >
                Grade Queue
              </button>
            </div>
          </article>

          <article className="app-panel p-3 p-md-4">
            <h2 className="h5 mb-3">Recently Graded</h2>
            {(dashboard?.recentlyGraded ?? []).length === 0 ? (
              <p className="text-secondary mb-0">No graded submissions yet.</p>
            ) : (
              <div className="activity-list">
                {dashboard.recentlyGraded.map((submission) => (
                  <article className="activity-item" key={submission.id}>
                    <div>
                      <strong>{submission.studentName}</strong>
                      <span>{formatDateTime(submission.submittedAt)}</span>
                    </div>
                    <TeacherSubmissionStatusBadge status={submission.status} />
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="app-panel p-3 p-md-4">
            <h2 className="h5 mb-3">Activity</h2>
            <div className="activity-list">
              {(dashboard?.activity ?? []).map((item) => (
                <article className="activity-item" key={item.id}>
                  <div>
                    <strong>{item.message}</strong>
                    <span>{item.type}</span>
                  </div>
                  <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <ConfirmDialog
        danger={confirmAction?.action === 'delete'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => runExamAction(confirmAction.action, confirmAction.examId)}
        open={Boolean(confirmAction)}
        title="Confirm exam action"
      >
        This will {confirmAction?.action} the selected exam.
      </ConfirmDialog>
    </section>
  )
}
