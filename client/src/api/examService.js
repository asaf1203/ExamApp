/**
 * Exam service/repository facade.
 *
 * UI modules should depend on this file rather than mockDb. The exported
 * functions intentionally map to future REST endpoints so backend migration can
 * keep the UI contract stable.
 */
import { ApiError, apiClient, mockRequest } from './apiClient'
import { USER_ROLES, requireMockRole } from './authService'
import {
  appendAttemptActivity,
  appendNotification,
  appendTeacherActivity,
  buildQuestionGrades,
  getExamOwnerId,
  isExamPublishedForStudents,
  persistSharedMockDb,
  syncAllPublishedExamAssignments,
  updateStudentScoreRecord,
} from './mockExamRepository'
import { mockDb, persistMockDb } from './mockDb'
import { appConfig } from '../config'
import {
  ATTEMPT_STATUSES,
  DASHBOARD_FILTERS,
  EXAM_STATUSES,
  calculateMaxScore,
  getMissingQuestionIds,
} from '../models/examModels'
import { isFuture, isPast, minIsoDate } from '../utils/dateTime'

/** Normalizes user-typed exam IDs for case-insensitive matching */
const normalizeId = (id) => String(id).trim().toUpperCase()

const normalizeAttemptId = (id) => String(id).trim().toUpperCase()

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

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

const findExam = (examId) => {
  const normalizedExamId = normalizeId(examId)
  const exam = mockDb.exams.find((item) => item.id === normalizedExamId)

  if (!exam) {
    throw new ApiError(`Exam "${examId}" was not found.`, {
      code: 'EXAM_NOT_FOUND',
      status: 404,
    })
  }

  return exam
}

const getStudentAssignments = (studentId) =>
  mockDb.examAssignments.filter((assignment) => {
    const exam = mockDb.exams.find((item) => item.id === assignment.examId)

    return assignment.studentId === studentId && isExamPublishedForStudents(exam)
  })

const findAssignment = (studentId, examId) => {
  syncAllPublishedExamAssignments()
  const normalizedExamId = normalizeId(examId)
  const assignment = mockDb.examAssignments.find(
    (item) => item.studentId === studentId && item.examId === normalizedExamId,
  )
  const exam = mockDb.exams.find((item) => item.id === normalizedExamId)

  if (!assignment || !isExamPublishedForStudents(exam)) {
    throw new ApiError('This exam is not assigned to the current student.', {
      code: 'ASSIGNMENT_NOT_FOUND',
      status: 404,
    })
  }

  return assignment
}

const getStudentExamAttempts = (studentId, examId) =>
  mockDb.examAttempts
    .filter(
      (attempt) =>
        attempt.studentId === studentId && attempt.examId === normalizeId(examId),
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

const findAttempt = (studentId, attemptId) => {
  const normalizedAttemptId = normalizeAttemptId(attemptId)
  const attempt = mockDb.examAttempts.find(
    (item) => item.studentId === studentId && item.id === normalizedAttemptId,
  )

  if (!attempt) {
    throw new ApiError('Exam attempt was not found.', {
      code: 'ATTEMPT_NOT_FOUND',
      status: 404,
    })
  }

  return attempt
}

const appendActivity = (attempt, type, message) => {
  appendAttemptActivity(attempt, type, message)
}

const sanitizeQuestionForTaking = (question) => {
  const safeQuestion = { ...question }

  delete safeQuestion.acceptedKeywords
  delete safeQuestion.correctAnswer
  delete safeQuestion.correctAnswers
  delete safeQuestion.sampleAnswer
  return safeQuestion
}

const sanitizeExamForTaking = (exam) => ({
  ...exam,
  questions: exam.questions.map(sanitizeQuestionForTaking),
})

const copyAttemptForClient = (attempt) => ({
  ...attempt,
  activityLog: attempt.activityLog ?? [],
  answers: attempt.answers ?? {},
  status:
    !attempt.resultsVisible && attempt.status === ATTEMPT_STATUSES.graded
      ? ATTEMPT_STATUSES.submitted
      : attempt.status,
  score:
    attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress
      ? attempt.score
      : null,
  scoreBreakdown:
    attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress
      ? attempt.scoreBreakdown ?? []
      : [],
  teacherFeedback:
    attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress
      ? attempt.teacherFeedback ?? ''
      : 'Submitted. Grades and feedback will appear after the teacher publishes results.',
})

const gradeAttempt = ({ attempt, exam, student, submittedBy = 'student' }) => {
  const now = new Date().toISOString()
  const scoreBreakdown = buildQuestionGrades(exam, attempt.answers)
  const score = scoreBreakdown.reduce((total, item) => total + item.score, 0)
  const maxScore = calculateMaxScore(exam.questions)

  Object.assign(attempt, {
    autosavedAt: now,
    maxScore,
    resultsVisible: false,
    score,
    scoreBreakdown,
    status: ATTEMPT_STATUSES.submitted,
    submittedAt: now,
    submittedBy,
    teacherFeedback: '',
  })

  appendActivity(
    attempt,
    submittedBy === 'timer' ? 'auto-submitted' : 'submitted',
    submittedBy === 'timer'
      ? 'Exam auto-submitted because the timer expired.'
      : 'Exam submitted by student.',
  )
  appendTeacherActivity(
    'submission',
    `${student.name} submitted ${exam.title}.`,
    attempt.id,
  )
  appendNotification({
    message: `${student.name} submitted ${exam.title}.`,
    targetId: attempt.id,
    type: 'submission-received',
    userId: getExamOwnerId(exam),
  })
  updateStudentScoreRecord(attempt, exam, student)

  return attempt
}

const syncExpiredAttempts = () => {
  let changed = false
  const now = new Date()

  mockDb.examAttempts.forEach((attempt) => {
    if (
      attempt.status === ATTEMPT_STATUSES.inProgress &&
      isPast(attempt.expiresAt, now)
    ) {
      const exam = mockDb.exams.find((item) => item.id === attempt.examId)
      const student = mockDb.users.find((item) => item.id === attempt.studentId)

      if (exam && student) {
        gradeAttempt({ attempt, exam, student, submittedBy: 'timer' })
      } else {
        attempt.status = ATTEMPT_STATUSES.expired
      }

      changed = true
    }
  })

  if (changed) {
    persistSharedMockDb()
  }
}

const getLatestSubmittedAttempt = (attempts) =>
  attempts.find((attempt) =>
    [ATTEMPT_STATUSES.graded, ATTEMPT_STATUSES.submitted].includes(attempt.status),
  )

const buildExamCard = (assignment) => {
  const exam = findExam(assignment.examId)
  const attempts = getStudentExamAttempts(assignment.studentId, assignment.examId)
  const activeAttempt = attempts.find(
    (attempt) => attempt.status === ATTEMPT_STATUSES.inProgress,
  )
  const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts)
  const now = new Date()
  const upcoming = isFuture(assignment.opensAt, now)
  const assignmentExpired = isPast(assignment.dueAt, now)
  const remainingAttempts = Math.max(0, assignment.maxAttempts - attempts.length)
  let status = EXAM_STATUSES.notStarted

  if (activeAttempt) {
    status = EXAM_STATUSES.inProgress
  } else if (
    latestSubmittedAttempt?.status === ATTEMPT_STATUSES.graded &&
    latestSubmittedAttempt.resultsVisible
  ) {
    status = EXAM_STATUSES.graded
  } else if (latestSubmittedAttempt?.status === ATTEMPT_STATUSES.submitted) {
    status = EXAM_STATUSES.submitted
  } else if (latestSubmittedAttempt?.status === ATTEMPT_STATUSES.graded) {
    status = EXAM_STATUSES.submitted
  } else if (assignmentExpired) {
    status = EXAM_STATUSES.expired
  }

  return {
    assignmentId: assignment.id,
    canContinue: Boolean(activeAttempt),
    canStart: !activeAttempt && !upcoming && !assignmentExpired && remainingAttempts > 0,
    completed: [EXAM_STATUSES.graded, EXAM_STATUSES.submitted].includes(status),
    description: exam.description,
    difficulty: exam.difficulty,
    dueAt: assignment.dueAt,
    durationMinutes: exam.durationMinutes,
    examId: exam.id,
    latestAttemptId: (latestSubmittedAttempt ?? activeAttempt)?.id ?? null,
    maxAttempts: assignment.maxAttempts,
    opensAt: assignment.opensAt,
    questionCount: exam.questions.length,
    remainingAttempts,
    score:
      latestSubmittedAttempt?.resultsVisible && latestSubmittedAttempt?.score != null
        ? {
            maxScore: latestSubmittedAttempt.maxScore,
            score: latestSubmittedAttempt.score,
          }
        : null,
    status,
    subject: exam.subject,
    title: exam.title,
    upcoming,
  }
}

const buildDashboardSummary = (cards, studentId) => {
  const gradedAttempts = mockDb.examAttempts.filter(
    (attempt) =>
      attempt.studentId === studentId &&
      attempt.status === ATTEMPT_STATUSES.graded &&
      attempt.maxScore > 0,
  )
  const bySubject = new Map()

  gradedAttempts.forEach((attempt) => {
    const exam = mockDb.exams.find((item) => item.id === attempt.examId)
    const subject = exam?.subject ?? 'General'
    const current = bySubject.get(subject) ?? { count: 0, percentageTotal: 0, subject }

    current.count += 1
    current.percentageTotal += Math.round((attempt.score / attempt.maxScore) * 100)
    bySubject.set(subject, current)
  })

  return {
    available: cards.filter(
      (card) =>
        !card.upcoming &&
        !card.completed &&
        card.status !== EXAM_STATUSES.expired &&
        card.status !== EXAM_STATUSES.inProgress,
    ).length,
    averageScore:
      gradedAttempts.length > 0
        ? Math.round(
            gradedAttempts.reduce(
              (total, attempt) => total + (attempt.score / attempt.maxScore) * 100,
              0,
            ) / gradedAttempts.length,
          )
        : null,
    completed: cards.filter((card) => card.completed).length,
    expired: cards.filter((card) => card.status === EXAM_STATUSES.expired).length,
    inProgress: cards.filter((card) => card.status === EXAM_STATUSES.inProgress)
      .length,
    performanceBySubject: [...bySubject.values()].map((item) => ({
      average: Math.round(item.percentageTotal / item.count),
      count: item.count,
      subject: item.subject,
    })),
    total: cards.length,
    upcoming: cards.filter((card) => card.upcoming).length,
  }
}

const filterCards = (cards, { group = DASHBOARD_FILTERS.all, search = '', status = 'all' }) => {
  const normalizedSearch = search.trim().toLowerCase()

  return cards.filter((card) => {
    const matchesSearch =
      !normalizedSearch ||
      [card.examId, card.title, card.description, card.subject].some((value) =>
        String(value ?? '').toLowerCase().includes(normalizedSearch),
      )
    const matchesStatus = status === 'all' || card.status === status
    const matchesGroup =
      group === DASHBOARD_FILTERS.all ||
      (group === DASHBOARD_FILTERS.available &&
        !card.upcoming &&
        !card.completed &&
        card.status !== EXAM_STATUSES.expired) ||
      (group === DASHBOARD_FILTERS.upcoming && card.upcoming) ||
      (group === DASHBOARD_FILTERS.completed && card.completed)

    return matchesSearch && matchesStatus && matchesGroup
  })
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

const listStudentExamsMock = (params = {}) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncAllPublishedExamAssignments()
    syncExpiredAttempts()

    const cards = getStudentAssignments(student.id)
      .map(buildExamCard)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    const filteredCards = filterCards(cards, params)

    return {
      ...paginate(filteredCards, params.page, params.pageSize),
      summary: buildDashboardSummary(cards, student.id),
    }
  })

const getStudentExamDetailsMock = (examId) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const assignment = findAssignment(student.id, examId)
    const exam = findExam(examId)
    const attempts = getStudentExamAttempts(student.id, examId)

    return {
      assignment,
      attempts: attempts.map(copyAttemptForClient),
      card: buildExamCard(assignment),
      exam: sanitizeExamForTaking(exam),
    }
  })

const startOrResumeExamMock = (examId) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const assignment = findAssignment(student.id, examId)
    const exam = findExam(examId)
    const attempts = getStudentExamAttempts(student.id, examId)
    const activeAttempt = attempts.find(
      (attempt) => attempt.status === ATTEMPT_STATUSES.inProgress,
    )

    if (activeAttempt) {
      appendActivity(activeAttempt, 'resumed', 'Exam resumed.')
      persistSharedMockDb()

      return {
        assignment,
        attempt: copyAttemptForClient(activeAttempt),
        exam: sanitizeExamForTaking(exam),
        resumed: true,
      }
    }

    if (isFuture(assignment.opensAt)) {
      throw new ApiError('This exam is not open yet.', {
        code: 'EXAM_NOT_OPEN',
        status: 409,
      })
    }

    if (isPast(assignment.dueAt)) {
      throw new ApiError('This exam has expired.', {
        code: 'EXAM_EXPIRED',
        status: 409,
      })
    }

    if (attempts.length >= assignment.maxAttempts) {
      throw new ApiError('No attempts remain for this exam.', {
        code: 'MAX_ATTEMPTS_REACHED',
        status: 409,
      })
    }

    const now = new Date()
    const durationExpiresAt = new Date(
      now.getTime() + exam.durationMinutes * 60 * 1000,
    ).toISOString()
    const attempt = {
      id: createId('ATT'),
      activityLog: [],
      answers: {},
      attemptNumber: attempts.length + 1,
      autosavedAt: now.toISOString(),
      examId: exam.id,
      expiresAt: minIsoDate(durationExpiresAt, assignment.dueAt),
      maxScore: calculateMaxScore(exam.questions),
      resultsVisible: false,
      score: null,
      scoreBreakdown: [],
      startedAt: now.toISOString(),
      status: ATTEMPT_STATUSES.inProgress,
      studentId: student.id,
      submittedAt: null,
      submittedBy: null,
      teacherFeedback: '',
    }

    appendActivity(attempt, 'started', 'Exam started.')
    mockDb.examAttempts.push(attempt)
    appendTeacherActivity(
      'submission',
      `${student.name} started ${exam.title}.`,
      attempt.id,
    )
    persistSharedMockDb()

    return {
      assignment,
      attempt: copyAttemptForClient(attempt),
      exam: sanitizeExamForTaking(exam),
      resumed: false,
    }
  })

const getAttemptContextMock = (attemptId) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const attempt = findAttempt(student.id, attemptId)
    const assignment = findAssignment(student.id, attempt.examId)
    const exam = findExam(attempt.examId)

    return {
      assignment,
      attempt: copyAttemptForClient(attempt),
      exam: sanitizeExamForTaking(exam),
    }
  })

const saveAttemptDraftMock = (attemptId, answers) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const attempt = findAttempt(student.id, attemptId)

    if (attempt.status !== ATTEMPT_STATUSES.inProgress) {
      throw new ApiError('This attempt can no longer be edited.', {
        code: 'ATTEMPT_LOCKED',
        status: 409,
      })
    }

    attempt.answers = answers ?? {}
    attempt.autosavedAt = new Date().toISOString()
    appendActivity(attempt, 'autosaved', 'Draft saved.')
    persistSharedMockDb()

    return copyAttemptForClient(attempt)
  })

const submitAttemptMock = (attemptId, { allowIncomplete = false, answers = {}, submittedBy = 'student' } = {}) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const attempt = findAttempt(student.id, attemptId)
    const exam = findExam(attempt.examId)

    if (attempt.status !== ATTEMPT_STATUSES.inProgress) {
      return {
        attempt: copyAttemptForClient(attempt),
        exam,
      }
    }

    const nextAnswers = answers ?? attempt.answers ?? {}
    const missingQuestionIds = getMissingQuestionIds(exam.questions, nextAnswers)

    if (!allowIncomplete && missingQuestionIds.length > 0) {
      throw new ApiError('Please answer every question before submitting.', {
        code: 'SUBMISSION_INCOMPLETE',
        details: { missingQuestionIds },
        status: 400,
      })
    }

    attempt.answers = nextAnswers
    gradeAttempt({ attempt, exam, student, submittedBy })
    persistSharedMockDb()

    return {
      attempt: copyAttemptForClient(attempt),
      exam: attempt.resultsVisible ? exam : sanitizeExamForTaking(exam),
    }
  })

const getAttemptResultMock = (attemptId) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    syncExpiredAttempts()

    const attempt = findAttempt(student.id, attemptId)
    const assignment = findAssignment(student.id, attempt.examId)
    const exam = findExam(attempt.examId)

    if (attempt.status === ATTEMPT_STATUSES.inProgress) {
      throw new ApiError('This attempt has not been submitted yet.', {
        code: 'RESULT_NOT_READY',
        status: 409,
      })
    }

    return {
      assignment,
      attempt: copyAttemptForClient(attempt),
      exam,
      history: getStudentExamAttempts(student.id, attempt.examId).map(copyAttemptForClient),
    }
  })

const getStudentActivityMock = () =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)

    return mockDb.examAttempts
      .filter((attempt) => attempt.studentId === student.id)
      .flatMap((attempt) => {
        const exam = mockDb.exams.find((item) => item.id === attempt.examId)

        return (attempt.activityLog ?? []).map((activity) => ({
          ...activity,
          attemptId: attempt.id,
          examId: attempt.examId,
          examTitle: exam?.title ?? attempt.examId,
        }))
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

const recordAttemptActivityMock = (attemptId, { message, type }) =>
  mockRequest(() => {
    const student = requireMockRole(USER_ROLES.student)
    const attempt = findAttempt(student.id, attemptId)

    appendActivity(attempt, type, message)
    persistSharedMockDb()

    return copyAttemptForClient(attempt)
  })

export const getAllExams = async () =>
  apiClient.isMock
    ? mockRequest(() => mockDb.exams)
    : apiClient.get('/exams', {
        cacheKey: 'exams:list',
        cacheTtlMs: appConfig.api.cacheTtlMs,
      })

export const getExamById = async (id) =>
  apiClient.isMock
    ? mockRequest(() => findExam(id))
    : apiClient.get(`/exams/${normalizeId(id)}`, {
        cacheKey: `exams:${normalizeId(id)}`,
        cacheTtlMs: appConfig.api.cacheTtlMs,
      })

/** Typo alias kept for backward compatibility with any existing imports */
export const getExamByld = getExamById

export const createExam = async (exam) =>
  apiClient.isMock
    ? mockRequest(() => {
        const nextExam = {
          id: exam.id ? normalizeId(exam.id) : `EX-${Date.now()}`,
          createdAt: new Date().toISOString(),
          createdBy: exam.createdBy ?? 'Teacher',
          description: exam.description ?? '',
          difficulty: exam.difficulty ?? 'Foundational',
          durationMinutes: Number(exam.durationMinutes ?? 60),
          questions: exam.questions ?? [],
          subject: exam.subject ?? 'General',
          title: exam.title,
        }

        mockDb.exams.push(nextExam)
        persistMockDb()
        return nextExam
      })
    : apiClient.post('/exams', exam)

export const getStudentScores = async () =>
  apiClient.isMock ? mockRequest(() => mockDb.studentScores) : apiClient.get('/scores')

export const getScoresByExamId = async (examId) =>
  apiClient.isMock
    ? mockRequest(() =>
        mockDb.studentScores.filter((score) => score.examId === normalizeId(examId)),
      )
    : apiClient.get(`/exams/${normalizeId(examId)}/scores`)

export const listStudentExams = async (params = {}) =>
  apiClient.isMock
    ? listStudentExamsMock(params)
    : apiClient.get(`/student/exams${toQueryString(params)}`, {
        cacheKey: `student:exams:${toQueryString(params)}`,
        cacheTtlMs: appConfig.api.studentCacheTtlMs,
      })

export const getStudentExamDetails = async (examId) =>
  apiClient.isMock
    ? getStudentExamDetailsMock(examId)
    : apiClient.get(`/student/exams/${normalizeId(examId)}`)

export const startOrResumeExam = async (examId) =>
  apiClient.isMock
    ? startOrResumeExamMock(examId)
    : apiClient.post(`/student/exams/${normalizeId(examId)}/attempts`)

export const getAttemptContext = async (attemptId) =>
  apiClient.isMock
    ? getAttemptContextMock(attemptId)
    : apiClient.get(`/student/attempts/${encodeURIComponent(attemptId)}`)

export const saveAttemptDraft = async (attemptId, answers) =>
  apiClient.isMock
    ? saveAttemptDraftMock(attemptId, answers)
    : apiClient.put(`/student/attempts/${encodeURIComponent(attemptId)}/draft`, {
        answers,
      })

export const submitAttempt = async (attemptId, payload) =>
  apiClient.isMock
    ? submitAttemptMock(attemptId, payload)
    : apiClient.post(`/student/attempts/${encodeURIComponent(attemptId)}/submit`, payload)

export const getAttemptResult = async (attemptId) =>
  apiClient.isMock
    ? getAttemptResultMock(attemptId)
    : apiClient.get(`/student/attempts/${encodeURIComponent(attemptId)}/result`)

export const getStudentActivity = async () =>
  apiClient.isMock ? getStudentActivityMock() : apiClient.get('/student/activity')

export const recordAttemptActivity = async (attemptId, payload) =>
  apiClient.isMock
    ? recordAttemptActivityMock(attemptId, payload)
    : apiClient.post(`/student/attempts/${encodeURIComponent(attemptId)}/activity`, payload)
