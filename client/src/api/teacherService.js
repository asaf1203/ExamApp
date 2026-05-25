/**
 * Teacher exam-management service facade.
 *
 * Components depend on this module, not mockDb. The mock implementation now
 * reads/writes the same exam and attempt records used by the student portal.
 * TODO backend: replace mock branches with REST calls while keeping signatures.
 */
import { ApiError, apiClient, mockRequest } from './apiClient'
import { USER_ROLES, requireMockRole } from './authService'
import {
  appendAttemptActivity,
  appendNotification,
  appendNotificationsForRole,
  appendTeacherActivity,
  applyTeacherGradesToAttempt,
  attemptToTeacherSubmission,
  cloneEntity,
  createMockId,
  getExamAttempts,
  getStudentName,
  getTeacherOwnedExams,
  persistSharedMockDb,
  syncPublishedExamAssignments,
  updateStudentScoreRecord,
} from './mockExamRepository'
import { mockDb } from './mockDb'
import { appConfig } from '../config'
import {
  ATTEMPT_STATUSES,
  QUESTION_TYPES,
  calculateMaxScore,
  normalizeOptions,
} from '../models/examModels'
import { EXAM_LIFECYCLE_STATUSES } from '../models/domainModels'
import {
  TEACHER_EXAM_FILTERS,
  TEACHER_EXAM_STATUSES,
  TEACHER_SUBMISSION_STATUSES,
  createEmptyTeacherExam,
  createEmptyTeacherQuestion,
  getTeacherExamMaxScore,
} from '../models/teacherModels'

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()

  return query ? `?${query}` : ''
}

const toLocalDateTimeInput = (isoValue) => {
  if (!isoValue) {
    return ''
  }

  const date = new Date(isoValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const fromLocalDateTimeInput = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const getTeacher = () => requireMockRole(USER_ROLES.teacher)

const findTeacherExam = (teacherId, examId) => {
  const exam = getTeacherOwnedExams(teacherId).find((item) => item.id === examId)

  if (!exam) {
    throw new ApiError('Teacher exam was not found.', {
      code: 'TEACHER_EXAM_NOT_FOUND',
      status: 404,
    })
  }

  return exam
}

const getTeacherAttemptContext = (teacherId, submissionId) => {
  const exams = getTeacherOwnedExams(teacherId)
  const examIds = new Set(exams.map((exam) => exam.id))
  const attempt = mockDb.examAttempts.find(
    (item) => item.id === submissionId && examIds.has(item.examId),
  )

  if (!attempt) {
    throw new ApiError('Submission was not found.', {
      code: 'TEACHER_SUBMISSION_NOT_FOUND',
      status: 404,
    })
  }

  const exam = exams.find((item) => item.id === attempt.examId)

  return { attempt, exam, exams }
}

const enrichExam = (exam) => {
  const submissions = getExamAttempts(exam.id).map((attempt) =>
    attemptToTeacherSubmission(attempt, exam),
  )

  return {
    ...exam,
    maxScore: getTeacherExamMaxScore(exam),
    pendingGrading: submissions.filter((submission) =>
      [TEACHER_SUBMISSION_STATUSES.submitted, TEACHER_SUBMISSION_STATUSES.grading].includes(
        submission.status,
      ),
    ).length,
    submissionsCount: submissions.length,
  }
}

const buildDashboard = (teacherId, params = {}) => {
  const exams = getTeacherOwnedExams(teacherId).map(enrichExam)
  const submissions = exams.flatMap((exam) =>
    getExamAttempts(exam.id).map((attempt) => attemptToTeacherSubmission(attempt, exam)),
  )
  const query = String(params.search ?? '').trim().toLowerCase()
  const status = params.status ?? TEACHER_EXAM_FILTERS.all
  const filteredExams = exams.filter((exam) => {
    const matchesStatus = status === TEACHER_EXAM_FILTERS.all || exam.status === status
    const matchesQuery =
      !query ||
      [exam.id, exam.title, exam.description, exam.instructions].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      )

    return matchesStatus && matchesQuery
  })

  return {
    activity: (mockDb.teacherActivity ?? []).slice(0, 8),
    exams: filteredExams.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    recentlyGraded: submissions
      .filter((submission) =>
        [TEACHER_SUBMISSION_STATUSES.graded, TEACHER_SUBMISSION_STATUSES.published].includes(
          submission.status,
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.gradedAt ?? b.submittedAt ?? 0).getTime() -
          new Date(a.gradedAt ?? a.submittedAt ?? 0).getTime(),
      )
      .slice(0, 5),
    stats: {
      activeSubmissions: submissions.filter(
        (submission) => submission.status === TEACHER_SUBMISSION_STATUSES.inProgress,
      ).length,
      archivedExams: exams.filter((exam) => exam.status === TEACHER_EXAM_STATUSES.archived)
        .length,
      draftExams: exams.filter((exam) => exam.status === TEACHER_EXAM_STATUSES.draft)
        .length,
      pendingGrading: submissions.filter((submission) =>
        [TEACHER_SUBMISSION_STATUSES.submitted, TEACHER_SUBMISSION_STATUSES.grading].includes(
          submission.status,
        ),
      ).length,
      publishedExams: exams.filter(
        (exam) => exam.status === TEACHER_EXAM_STATUSES.published,
      ).length,
      totalExams: exams.length,
      totalSubmissions: submissions.length,
    },
    templates: mockDb.examTemplates ?? [],
  }
}

const paginate = (items, page = 1, pageSize = appConfig.exams.defaultPageSize) => {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || appConfig.exams.defaultPageSize)
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: items.length,
  }
}

const normalizeExamPayload = (payload, teacherId, existingExam = null) => {
  const now = new Date().toISOString()
  const availability = {
    dueAt:
      fromLocalDateTimeInput(payload.availability?.dueAt) ||
      payload.availability?.dueAt ||
      existingExam?.availability?.dueAt ||
      '',
    opensAt:
      fromLocalDateTimeInput(payload.availability?.opensAt) ||
      payload.availability?.opensAt ||
      existingExam?.availability?.opensAt ||
      '',
  }
  const nextExam = {
    ...createEmptyTeacherExam(teacherId),
    ...existingExam,
    ...payload,
    availability,
    createdAt: existingExam?.createdAt ?? payload.createdAt ?? now,
    createdBy:
      existingExam?.createdBy ??
      mockDb.users.find((user) => user.id === teacherId)?.name ??
      'Teacher',
    durationMinutes: Number(payload.durationMinutes ?? existingExam?.durationMinutes ?? 60),
    maxAttempts: Number(payload.maxAttempts ?? existingExam?.maxAttempts ?? 1),
    ownerTeacherId: teacherId,
    passingGrade: Number(payload.passingGrade ?? existingExam?.passingGrade ?? 70),
    questions: (payload.questions ?? existingExam?.questions ?? []).map((question, index) => ({
      ...question,
      id: question.id || createMockId(`Q-${index + 1}`),
      options: question.options ? normalizeOptions(question) : undefined,
      points: Number(question.points || 0),
      required: Boolean(question.required),
    })),
    status: payload.status ?? existingExam?.status ?? TEACHER_EXAM_STATUSES.draft,
    subject: payload.subject ?? existingExam?.subject ?? 'Teacher Managed',
    updatedAt: now,
    visibilityScope: payload.visibilityScope ?? existingExam?.visibilityScope ?? 'assigned',
  }

  if (!nextExam.title.trim()) {
    throw new ApiError('Exam title is required.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }

  if (!nextExam.description.trim()) {
    throw new ApiError('Description is required.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }

  if (nextExam.durationMinutes < 5) {
    throw new ApiError('Duration must be at least 5 minutes.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }

  if (nextExam.questions.length === 0) {
    throw new ApiError('Add at least one question.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    })
  }

  nextExam.questions.forEach((question, index) => {
    if (!String(question.prompt ?? '').trim()) {
      throw new ApiError(`Question ${index + 1} needs a prompt.`, {
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }

    if (Number(question.points || 0) <= 0) {
      throw new ApiError(`Question ${index + 1} needs points greater than zero.`, {
        code: 'VALIDATION_ERROR',
        status: 400,
      })
    }
  })

  return nextExam
}

const toEditorExam = (exam) => ({
  ...exam,
  availability: {
    dueAt: toLocalDateTimeInput(exam.availability?.dueAt),
    opensAt: toLocalDateTimeInput(exam.availability?.opensAt),
  },
})

const listTeacherDashboardMock = (params) =>
  mockRequest(() => {
    const teacher = getTeacher()
    return buildDashboard(teacher.id, params)
  })

const listTeacherExamsMock = (params = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const dashboard = buildDashboard(teacher.id, params)
    return paginate(dashboard.exams, params.page, params.pageSize)
  })

const getTeacherExamMock = (examId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    return toEditorExam(enrichExam(findTeacherExam(teacher.id, examId)))
  })

const createTeacherExamMock = (payload = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const now = new Date().toISOString()
    const baseExam = {
      ...createEmptyTeacherExam(teacher.id),
      ...payload,
      createdAt: now,
      createdBy: teacher.name,
      id: createMockId('EX'),
      ownerTeacherId: teacher.id,
      publishedAt: null,
      status: TEACHER_EXAM_STATUSES.draft,
      title: payload.title || 'Untitled Exam',
      updatedAt: now,
      visibilityScope: 'assigned',
    }

    mockDb.exams.unshift(baseExam)
    appendTeacherActivity('exam', `Created ${baseExam.title}.`, baseExam.id)
    persistSharedMockDb()

    return toEditorExam(enrichExam(baseExam))
  })

const saveTeacherExamMock = (examId, payload, { autosave = false } = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)
    const normalizedExam = autosave
      ? {
          ...existingExam,
          ...payload,
          availability: {
            dueAt:
              fromLocalDateTimeInput(payload.availability?.dueAt) ||
              payload.availability?.dueAt ||
              existingExam.availability?.dueAt ||
              '',
            opensAt:
              fromLocalDateTimeInput(payload.availability?.opensAt) ||
              payload.availability?.opensAt ||
              existingExam.availability?.opensAt ||
              '',
          },
          durationMinutes: Number(payload.durationMinutes ?? existingExam.durationMinutes ?? 60),
          maxAttempts: Number(payload.maxAttempts ?? existingExam.maxAttempts ?? 1),
          questions: (payload.questions ?? existingExam.questions ?? []).map((question, index) => ({
            ...question,
            id: question.id || createMockId(`Q-${index + 1}`),
            options: question.options ? normalizeOptions(question) : undefined,
            points: Number(question.points || 0),
            required: Boolean(question.required),
          })),
          updatedAt: new Date().toISOString(),
        }
      : normalizeExamPayload(payload, teacher.id, existingExam)

    Object.assign(existingExam, normalizedExam, {
      autosavedAt: autosave ? new Date().toISOString() : existingExam.autosavedAt,
      createdAt: existingExam.createdAt,
      id: existingExam.id,
      ownerTeacherId: teacher.id,
    })

    if (existingExam.status === TEACHER_EXAM_STATUSES.published) {
      syncPublishedExamAssignments(existingExam)
    }

    appendTeacherActivity(
      'exam',
      autosave ? `Autosaved ${existingExam.title}.` : `Saved ${existingExam.title}.`,
      existingExam.id,
    )
    persistSharedMockDb()

    return toEditorExam(enrichExam(existingExam))
  })

const deleteTeacherExamMock = (examId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)

    if (existingExam.status === TEACHER_EXAM_STATUSES.published) {
      throw new ApiError('Unpublish or archive this exam before deleting it.', {
        code: 'PUBLISHED_DELETE_BLOCKED',
        status: 409,
      })
    }

    mockDb.exams = mockDb.exams.filter((exam) => exam.id !== examId)
    mockDb.examAssignments = mockDb.examAssignments.filter(
      (assignment) => assignment.examId !== examId,
    )
    mockDb.examAttempts = mockDb.examAttempts.filter((attempt) => attempt.examId !== examId)
    mockDb.studentScores = mockDb.studentScores.filter((score) => score.examId !== examId)
    appendTeacherActivity('exam', `Deleted ${existingExam.title}.`, examId)
    persistSharedMockDb()

    return { success: true }
  })

const duplicateTeacherExamMock = (examId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)
    const now = new Date().toISOString()
    const duplicate = {
      ...cloneEntity(existingExam),
      archivedAt: null,
      createdAt: now,
      id: createMockId('EX'),
      publishedAt: null,
      questions: existingExam.questions.map((question, index) => ({
        ...cloneEntity(question),
        id: createMockId(`Q-${index + 1}`),
      })),
      status: TEACHER_EXAM_STATUSES.draft,
      title: `${existingExam.title} Copy`,
      updatedAt: now,
    }

    mockDb.exams.unshift(duplicate)
    appendTeacherActivity('exam', `Duplicated ${existingExam.title}.`, duplicate.id)
    persistSharedMockDb()

    return toEditorExam(enrichExam(duplicate))
  })

const updateTeacherExamStatusMock = (examId, status) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)
    const now = new Date().toISOString()

    if (status === TEACHER_EXAM_STATUSES.published) {
      if (!existingExam.availability?.opensAt || !existingExam.availability?.dueAt) {
        throw new ApiError('Set availability dates before publishing.', {
          code: 'PUBLISH_VALIDATION_ERROR',
          status: 400,
        })
      }

      existingExam.publishedAt = existingExam.publishedAt ?? now
      existingExam.archivedAt = null
      existingExam.status = EXAM_LIFECYCLE_STATUSES.published
      syncPublishedExamAssignments(existingExam)
      appendNotificationsForRole({
        message: `${existingExam.title} is now available.`,
        role: USER_ROLES.student,
        targetId: existingExam.id,
        type: 'exam-published',
      })
    }

    if (status === TEACHER_EXAM_STATUSES.draft) {
      existingExam.publishedAt = null
      existingExam.archivedAt = null
      existingExam.status = EXAM_LIFECYCLE_STATUSES.draft
    }

    if (status === TEACHER_EXAM_STATUSES.archived) {
      existingExam.archivedAt = now
      existingExam.status = EXAM_LIFECYCLE_STATUSES.archived
    }

    existingExam.updatedAt = now
    appendTeacherActivity('publish', `${status} ${existingExam.title}.`, existingExam.id)
    persistSharedMockDb()

    return toEditorExam(enrichExam(existingExam))
  })

const listTeacherSubmissionsMock = (params = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const exams = getTeacherOwnedExams(teacher.id)
    const examById = new Map(exams.map((exam) => [exam.id, exam]))
    const query = String(params.search ?? '').trim().toLowerCase()
    const status = params.status ?? 'all'
    const examId = params.examId ?? 'all'
    const submissions = mockDb.examAttempts
      .filter((attempt) => examById.has(attempt.examId))
      .filter((attempt) => examId === 'all' || attempt.examId === examId)
      .map((attempt) => attemptToTeacherSubmission(attempt, examById.get(attempt.examId)))
      .filter((submission) => status === 'all' || submission.status === status)
      .filter((submission) =>
        !query ||
        [submission.studentName, submission.id, submission.examTitle].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() -
          new Date(a.submittedAt ?? a.startedAt).getTime(),
      )

    return paginate(submissions, params.page, params.pageSize)
  })

const getTeacherSubmissionMock = (submissionId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const { attempt, exam, exams } = getTeacherAttemptContext(teacher.id, submissionId)
    const submissions = mockDb.examAttempts
      .filter((item) => exams.some((teacherExam) => teacherExam.id === item.examId))
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() -
          new Date(a.submittedAt ?? a.startedAt).getTime(),
      )
    const currentIndex = submissions.findIndex((item) => item.id === attempt.id)

    return {
      exam,
      nextSubmissionId: submissions[currentIndex + 1]?.id ?? null,
      previousSubmissionId: submissions[currentIndex - 1]?.id ?? null,
      submission: attemptToTeacherSubmission(attempt, exam),
    }
  })

const assertSubmissionCanBeGraded = (attempt) => {
  if (attempt.status === ATTEMPT_STATUSES.inProgress) {
    throw new ApiError('Active attempts cannot be graded until the student submits.', {
      code: 'ATTEMPT_IN_PROGRESS',
      status: 409,
    })
  }
}

const saveTeacherSubmissionGradesMock = (submissionId, payload = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const { attempt, exam } = getTeacherAttemptContext(teacher.id, submissionId)
    assertSubmissionCanBeGraded(attempt)

    attempt.scoreBreakdown = payload.questionGrades ?? attempt.scoreBreakdown
    attempt.teacherFeedback = payload.overallFeedback ?? attempt.teacherFeedback
    attempt.gradingDraftSavedAt = new Date().toISOString()
    appendTeacherActivity('grading', `Saved grading draft for ${getStudentName(attempt.studentId)}.`, attempt.id)
    persistSharedMockDb()

    return attemptToTeacherSubmission(attempt, exam)
  })

const updateTeacherSubmissionStatusMock = (submissionId, status, payload = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const { attempt, exam } = getTeacherAttemptContext(teacher.id, submissionId)
    const student = mockDb.users.find((user) => user.id === attempt.studentId)
    const questionGrades =
      payload.questionGrades ?? attempt.scoreBreakdown ?? attemptToTeacherSubmission(attempt, exam).questionGrades
    const overallFeedback =
      payload.overallFeedback !== undefined ? payload.overallFeedback : attempt.teacherFeedback
    assertSubmissionCanBeGraded(attempt)

    if (status === TEACHER_SUBMISSION_STATUSES.graded) {
      applyTeacherGradesToAttempt(attempt, {
        overallFeedback,
        questionGrades,
        resultsVisible: false,
        status: ATTEMPT_STATUSES.graded,
      })
      appendTeacherActivity(
        'grading',
        `Marked grading complete for ${getStudentName(attempt.studentId)}.`,
        attempt.id,
      )
    }

    if (status === TEACHER_SUBMISSION_STATUSES.published) {
      applyTeacherGradesToAttempt(attempt, {
        overallFeedback,
        questionGrades,
        resultsVisible: true,
        status: ATTEMPT_STATUSES.graded,
      })
      appendAttemptActivity(attempt, 'results-published', 'Teacher published grades.')
      appendNotification({
        message: `Grades published for ${exam.title}.`,
        targetId: attempt.id,
        type: 'grades-published',
        userId: attempt.studentId,
      })
      appendTeacherActivity(
        'grading',
        `Published grades for ${getStudentName(attempt.studentId)}.`,
        attempt.id,
      )
    }

    if (status === TEACHER_SUBMISSION_STATUSES.submitted) {
      attempt.resultsVisible = false
      attempt.teacherFeedback = overallFeedback
      attempt.scoreBreakdown = questionGrades
      appendTeacherActivity('grading', `Hid results for ${getStudentName(attempt.studentId)}.`, attempt.id)
    }

    if (student) {
      updateStudentScoreRecord(attempt, exam, student)
    }

    persistSharedMockDb()

    return attemptToTeacherSubmission(attempt, exam)
  })

export const listTeacherDashboard = async (params = {}) =>
  apiClient.isMock
    ? listTeacherDashboardMock(params)
    : apiClient.get(`/teacher/dashboard${toQueryString(params)}`, {
        cacheKey: `teacher:dashboard:${toQueryString(params)}`,
        cacheTtlMs: appConfig.api.teacherCacheTtlMs,
      })

export const listTeacherExams = async (params = {}) =>
  apiClient.isMock
    ? listTeacherExamsMock(params)
    : apiClient.get(`/teacher/exams${toQueryString(params)}`, {
        cacheKey: `teacher:exams:${toQueryString(params)}`,
        cacheTtlMs: appConfig.api.teacherCacheTtlMs,
      })

export const getTeacherExam = async (examId) =>
  apiClient.isMock
    ? getTeacherExamMock(examId)
    : apiClient.get(`/teacher/exams/${encodeURIComponent(examId)}`)

export const createTeacherExam = async (payload = {}) =>
  apiClient.isMock ? createTeacherExamMock(payload) : apiClient.post('/teacher/exams', payload)

export const saveTeacherExam = async (examId, payload) =>
  apiClient.isMock
    ? saveTeacherExamMock(examId, payload)
    : apiClient.put(`/teacher/exams/${encodeURIComponent(examId)}`, payload)

export const autosaveTeacherExam = async (examId, payload) =>
  apiClient.isMock
    ? saveTeacherExamMock(examId, payload, { autosave: true })
    : apiClient.put(`/teacher/exams/${encodeURIComponent(examId)}/draft`, payload)

export const deleteTeacherExam = async (examId) =>
  apiClient.isMock
    ? deleteTeacherExamMock(examId)
    : apiClient.del(`/teacher/exams/${encodeURIComponent(examId)}`)

export const duplicateTeacherExam = async (examId) =>
  apiClient.isMock
    ? duplicateTeacherExamMock(examId)
    : apiClient.post(`/teacher/exams/${encodeURIComponent(examId)}/duplicate`)

export const publishTeacherExam = async (examId) =>
  apiClient.isMock
    ? updateTeacherExamStatusMock(examId, TEACHER_EXAM_STATUSES.published)
    : apiClient.post(`/teacher/exams/${encodeURIComponent(examId)}/publish`)

export const unpublishTeacherExam = async (examId) =>
  apiClient.isMock
    ? updateTeacherExamStatusMock(examId, TEACHER_EXAM_STATUSES.draft)
    : apiClient.post(`/teacher/exams/${encodeURIComponent(examId)}/unpublish`)

export const archiveTeacherExam = async (examId) =>
  apiClient.isMock
    ? updateTeacherExamStatusMock(examId, TEACHER_EXAM_STATUSES.archived)
    : apiClient.post(`/teacher/exams/${encodeURIComponent(examId)}/archive`)

export const listTeacherSubmissions = async (params = {}) =>
  apiClient.isMock
    ? listTeacherSubmissionsMock(params)
    : apiClient.get(`/teacher/submissions${toQueryString(params)}`, {
        cacheKey: `teacher:submissions:${toQueryString(params)}`,
        cacheTtlMs: appConfig.api.teacherCacheTtlMs,
      })

export const getTeacherSubmission = async (submissionId) =>
  apiClient.isMock
    ? getTeacherSubmissionMock(submissionId)
    : apiClient.get(`/teacher/submissions/${encodeURIComponent(submissionId)}`)

export const saveTeacherSubmissionGrades = async (submissionId, payload) =>
  apiClient.isMock
    ? saveTeacherSubmissionGradesMock(submissionId, payload)
    : apiClient.put(`/teacher/submissions/${encodeURIComponent(submissionId)}/grades`, payload)

export const markTeacherSubmissionGraded = async (submissionId, payload) =>
  apiClient.isMock
    ? updateTeacherSubmissionStatusMock(
        submissionId,
        TEACHER_SUBMISSION_STATUSES.graded,
        payload,
      )
    : apiClient.post(`/teacher/submissions/${encodeURIComponent(submissionId)}/complete`, payload)

export const publishTeacherSubmissionGrades = async (submissionId, payload) =>
  apiClient.isMock
    ? updateTeacherSubmissionStatusMock(
        submissionId,
        TEACHER_SUBMISSION_STATUSES.published,
        payload,
      )
    : apiClient.post(`/teacher/submissions/${encodeURIComponent(submissionId)}/publish`, payload)

export const hideTeacherSubmissionGrades = async (submissionId, payload) =>
  apiClient.isMock
    ? updateTeacherSubmissionStatusMock(
        submissionId,
        TEACHER_SUBMISSION_STATUSES.submitted,
        payload,
      )
    : apiClient.post(`/teacher/submissions/${encodeURIComponent(submissionId)}/hide`, payload)

export const createTeacherQuestion = createEmptyTeacherQuestion
export { QUESTION_TYPES, calculateMaxScore }
