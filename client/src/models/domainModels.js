export const EXAM_LIFECYCLE_STATUSES = Object.freeze({
  active: 'active',
  archived: 'archived',
  draft: 'draft',
  graded: 'graded',
  inProgress: 'in-progress',
  published: 'published',
  submitted: 'submitted',
})

export const VISIBILITY_SCOPES = Object.freeze({
  assigned: 'assigned',
  public: 'public',
})

/**
 * Shared browser-safe domain contracts. These mirror the resources expected
 * from a future backend and keep student/teacher modules aligned today.
 *
 * @typedef {Object} UserEntity
 * @property {string} id
 * @property {'student'|'teacher'} role
 * @property {string} name
 * @property {string} email
 *
 * @typedef {Object} ExamEntity
 * @property {string} id
 * @property {string} ownerTeacherId
 * @property {string} status
 * @property {{opensAt: string, dueAt: string}} availability
 * @property {number} durationMinutes
 * @property {number} maxAttempts
 * @property {Array} questions
 *
 * @typedef {Object} ExamAttemptEntity
 * @property {string} id
 * @property {string} examId
 * @property {string} studentId
 * @property {string} status
 * @property {boolean} resultsVisible
 * @property {Record<string, string|string[]>} answers
 */
