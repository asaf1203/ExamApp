import { useCallback, useEffect, useState } from 'react'
import {
  archiveTeacherExam,
  deleteTeacherExam,
  duplicateTeacherExam,
  listTeacherExams,
  publishTeacherExam,
  unpublishTeacherExam,
} from '../../../api/teacherService'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import { TEACHER_EXAM_FILTERS } from '../../../models/teacherModels'
import { ROUTES, buildTeacherExamEditorPath, useRouter } from '../../../routing/router'
import { useToast } from '../../../ui/ToastContext'
import { TeacherExamTable } from '../components/TeacherExamTable'

const filterOptions = [
  { label: 'All', value: TEACHER_EXAM_FILTERS.all },
  { label: 'Drafts', value: TEACHER_EXAM_FILTERS.draft },
  { label: 'Published', value: TEACHER_EXAM_FILTERS.published },
  { label: 'Archived', value: TEACHER_EXAM_FILTERS.archived },
]

export function TeacherExamListPage() {
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [confirmAction, setConfirmAction] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(TEACHER_EXAM_FILTERS.all)

  const loadExams = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await listTeacherExams({ page: 1, search, status })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await listTeacherExams({ page: 1, search, status })

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
  }, [search, status])

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
      await loadExams()
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Action failed' })
    } finally {
      setConfirmAction(null)
    }
  }

  const archiveSelected = async () => {
    try {
      await Promise.all(selectedIds.map((examId) => archiveTeacherExam(examId)))
      notify({ message: `${selectedIds.length} exams archived.`, tone: 'success' })
      setSelectedIds([])
      await loadExams()
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Bulk action failed' })
    }
  }

  const exams = data?.items ?? []

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Exam Management</p>
          <h1>Teacher Exams</h1>
          <p className="text-secondary mb-0">
            Create, edit, publish, duplicate, archive, and delete exams.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(ROUTES.teacherExamCreate)}
          type="button"
        >
          Create Exam
        </button>
      </div>

      <section className="app-panel p-3 p-md-4">
        <div className="dashboard-controls">
          <div className="filter-tabs" role="tablist" aria-label="Exam status filter">
            {filterOptions.map((option) => (
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

          <div className="control-row">
            <input
              className="form-control"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exams"
              type="search"
              value={search}
            />
            <button
              className="btn btn-outline-primary"
              disabled={selectedIds.length === 0}
              onClick={archiveSelected}
              type="button"
            >
              Archive Selected
            </button>
          </div>
        </div>

        {loading && <LoadingState label="Loading teacher exams" rows={5} />}
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
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
            description="Adjust filters or start from a blank exam."
            title="No teacher exams found"
          />
        )}
        {!loading && !error && exams.length > 0 && (
          <TeacherExamTable
            exams={exams}
            onArchive={(examId) => setConfirmAction({ action: 'archive', examId })}
            onDelete={(examId) => setConfirmAction({ action: 'delete', examId })}
            onDuplicate={(examId) => runExamAction('duplicate', examId)}
            onPublish={(examId) => setConfirmAction({ action: 'publish', examId })}
            onSelect={(examId, checked) =>
              setSelectedIds((current) =>
                checked
                  ? [...current, examId]
                  : current.filter((selectedId) => selectedId !== examId),
              )
            }
            onUnpublish={(examId) => setConfirmAction({ action: 'unpublish', examId })}
            selectable
            selectedIds={selectedIds}
          />
        )}
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
