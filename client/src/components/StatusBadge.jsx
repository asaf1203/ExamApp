import { EXAM_STATUS_LABELS, EXAM_STATUSES } from '../models/examModels'

const statusClassNames = {
  [EXAM_STATUSES.notStarted]: 'status-badge status-badge-neutral',
  [EXAM_STATUSES.inProgress]: 'status-badge status-badge-active',
  [EXAM_STATUSES.submitted]: 'status-badge status-badge-submitted',
  [EXAM_STATUSES.graded]: 'status-badge status-badge-success',
  [EXAM_STATUSES.expired]: 'status-badge status-badge-danger',
}

export function StatusBadge({ status }) {
  return (
    <span className={statusClassNames[status] ?? statusClassNames[EXAM_STATUSES.notStarted]}>
      {EXAM_STATUS_LABELS[status] ?? status}
    </span>
  )
}
