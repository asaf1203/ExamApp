import {
  TEACHER_EXAM_STATUSES,
} from '../../../models/teacherModels'
import {
  buildTeacherExamEditorPath,
  buildTeacherExamPreviewPath,
  useRouter,
} from '../../../routing/router'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { TeacherExamStatusBadge } from './TeacherStatusBadge'

export function TeacherExamTable({
  exams,
  onArchive,
  onDelete,
  onDuplicate,
  onPublish,
  onUnpublish,
  selectable = false,
  selectedIds = [],
  onSelect,
}) {
  const { navigate } = useRouter()
  const selectedSet = new Set(selectedIds)

  return (
    <div className="table-responsive management-table">
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            {selectable && <th className="table-check">Select</th>}
            <th>Exam</th>
            <th>Status</th>
            <th>Questions</th>
            <th>Duration</th>
            <th>Submissions</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam.id}>
              {selectable && (
                <td>
                  <input
                    aria-label={`Select ${exam.title}`}
                    checked={selectedSet.has(exam.id)}
                    onChange={(event) => onSelect?.(exam.id, event.target.checked)}
                    type="checkbox"
                  />
                </td>
              )}
              <td>
                <div className="table-title">{exam.title}</div>
                <div className="text-secondary small">{exam.description}</div>
              </td>
              <td>
                <TeacherExamStatusBadge status={exam.status} />
              </td>
              <td>{exam.questions?.length ?? 0}</td>
              <td>{formatDuration(exam.durationMinutes)}</td>
              <td>
                <strong>{exam.submissionsCount ?? 0}</strong>
                {exam.pendingGrading > 0 && (
                  <span className="text-secondary small d-block">
                    {exam.pendingGrading} pending
                  </span>
                )}
              </td>
              <td>{formatDateTime(exam.updatedAt)}</td>
              <td>
                <div className="table-actions">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigate(buildTeacherExamEditorPath(exam.id))}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigate(buildTeacherExamPreviewPath(exam.id))}
                    type="button"
                  >
                    Preview
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onDuplicate(exam.id)}
                    type="button"
                  >
                    Duplicate
                  </button>
                  {exam.status === TEACHER_EXAM_STATUSES.published ? (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onUnpublish(exam.id)}
                      type="button"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={exam.status === TEACHER_EXAM_STATUSES.archived}
                      onClick={() => onPublish(exam.id)}
                      type="button"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={exam.status === TEACHER_EXAM_STATUSES.archived}
                    onClick={() => onArchive(exam.id)}
                    type="button"
                  >
                    Archive
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    disabled={exam.status === TEACHER_EXAM_STATUSES.published}
                    onClick={() => onDelete(exam.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
