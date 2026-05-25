import {
  TEACHER_EXAM_STATUS_LABELS,
  TEACHER_EXAM_STATUSES,
  TEACHER_SUBMISSION_STATUS_LABELS,
  TEACHER_SUBMISSION_STATUSES,
} from '../../../models/teacherModels'

const examClassNames = {
  [TEACHER_EXAM_STATUSES.draft]: 'status-badge status-badge-neutral',
  [TEACHER_EXAM_STATUSES.published]: 'status-badge status-badge-success',
  [TEACHER_EXAM_STATUSES.archived]: 'status-badge status-badge-danger',
}

const submissionClassNames = {
  [TEACHER_SUBMISSION_STATUSES.expired]: 'status-badge status-badge-danger',
  [TEACHER_SUBMISSION_STATUSES.grading]: 'status-badge status-badge-active',
  [TEACHER_SUBMISSION_STATUSES.graded]: 'status-badge status-badge-submitted',
  [TEACHER_SUBMISSION_STATUSES.inProgress]: 'status-badge status-badge-active',
  [TEACHER_SUBMISSION_STATUSES.published]: 'status-badge status-badge-success',
  [TEACHER_SUBMISSION_STATUSES.submitted]: 'status-badge status-badge-info',
}

export function TeacherExamStatusBadge({ status }) {
  return (
    <span className={examClassNames[status] ?? examClassNames[TEACHER_EXAM_STATUSES.draft]}>
      {TEACHER_EXAM_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function TeacherSubmissionStatusBadge({ status }) {
  return (
    <span
      className={
        submissionClassNames[status] ??
        submissionClassNames[TEACHER_SUBMISSION_STATUSES.submitted]
      }
    >
      {TEACHER_SUBMISSION_STATUS_LABELS[status] ?? status}
    </span>
  )
}
