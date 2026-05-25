import { USER_ROLES } from './authService'
import { mockDb, persistMockDb } from './mockDb'
import {
  ATTEMPT_STATUSES,
  gradeQuestionAnswer,
} from '../models/examModels'
import { EXAM_LIFECYCLE_STATUSES } from '../models/domainModels'
import {
  TEACHER_SUBMISSION_STATUSES,
  getSubmissionMaxScore,
  getSubmissionPercentage,
  getSubmissionScore,
} from '../models/teacherModels'

export const createMockId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

export const normalizeEntityId = (id) => String(id).trim().toUpperCase()

export const cloneEntity = (value) => structuredClone(value)

export const getStudents = () =>
  mockDb.users.filter((user) => user.role === USER_ROLES.student)

export const getTeachers = () =>
  mockDb.users.filter((user) => user.role === USER_ROLES.teacher)

export const getExamOwnerId = (exam) =>
  exam.ownerTeacherId ?? getTeachers()[0]?.id ?? 'TCH-1'

export const getTeacherOwnedExams = (teacherId) =>
  mockDb.exams.filter((exam) => getExamOwnerId(exam) === teacherId)

export const findSharedExam = (examId) =>
  mockDb.exams.find((exam) => exam.id === normalizeEntityId(examId))

export const isExamPublishedForStudents = (exam) =>
  exam?.status === EXAM_LIFECYCLE_STATUSES.published && !exam.archivedAt

export const getExamAttempts = (examId) =>
  mockDb.examAttempts.filter((attempt) => attempt.examId === normalizeEntityId(examId))

export const getStudentAttemptsForExam = (studentId, examId) =>
  getExamAttempts(examId)
    .filter((attempt) => attempt.studentId === studentId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

export const getStudentName = (studentId) =>
  mockDb.users.find((user) => user.id === studentId)?.name ?? studentId

export const getTeacherName = (teacherId) =>
  mockDb.users.find((user) => user.id === teacherId)?.name ?? 'Teacher'

export const appendTeacherActivity = (type, message, targetId) => {
  mockDb.teacherActivity = mockDb.teacherActivity ?? []
  mockDb.teacherActivity.unshift({
    id: createMockId('TACT'),
    createdAt: new Date().toISOString(),
    message,
    targetId,
    type,
  })
}

export const appendAttemptActivity = (attempt, type, message) => {
  attempt.activityLog = attempt.activityLog ?? []
  attempt.activityLog.push({
    id: createMockId('ACT'),
    createdAt: new Date().toISOString(),
    message,
    type,
  })
}

export const appendNotification = ({ message, targetId, type, userId }) => {
  mockDb.notifications = mockDb.notifications ?? []
  mockDb.notifications.unshift({
    id: createMockId('NTF'),
    createdAt: new Date().toISOString(),
    message,
    readAt: null,
    targetId,
    type,
    userId,
  })
}

export const appendNotificationsForRole = ({ message, role, targetId, type }) => {
  mockDb.users
    .filter((user) => user.role === role)
    .forEach((user) => appendNotification({ message, targetId, type, userId: user.id }))
}

export const syncPublishedExamAssignments = (exam) => {
  mockDb.examAssignments = mockDb.examAssignments ?? []

  if (!isExamPublishedForStudents(exam)) {
    return
  }

  getStudents().forEach((student) => {
    const existingAssignment = mockDb.examAssignments.find(
      (assignment) => assignment.studentId === student.id && assignment.examId === exam.id,
    )
    const assignment = {
      allowMultipleAttempts: Number(exam.maxAttempts ?? 1) > 1,
      dueAt: exam.availability?.dueAt ?? '',
      examId: exam.id,
      integrityPolicy:
        exam.integrityPolicy ??
        'Autosave is enabled. Teachers can review progress and submission activity.',
      instructions:
        exam.instructions ||
        'Read each question carefully and submit before the due date.',
      maxAttempts: Number(exam.maxAttempts ?? 1),
      opensAt: exam.availability?.opensAt ?? '',
      studentId: student.id,
    }

    if (existingAssignment) {
      Object.assign(existingAssignment, assignment)
    } else {
      mockDb.examAssignments.push({
        ...assignment,
        id: `ASN-${exam.id}-${student.id}`,
      })
    }
  })
}

export const syncAllPublishedExamAssignments = () => {
  mockDb.exams.filter(isExamPublishedForStudents).forEach(syncPublishedExamAssignments)
}

export const buildQuestionGrades = (exam, answers = {}) =>
  exam.questions.map((question) => {
    const grade = gradeQuestionAnswer(question, answers?.[question.id])

    return {
      answer: answers?.[question.id] ?? '',
      autoScore: grade.score,
      feedback: grade.feedback,
      isCorrect: grade.isCorrect,
      maxScore: grade.maxScore,
      overridden: false,
      questionId: question.id,
      score: grade.score,
    }
  })

export const calculateAttemptDurationMinutes = (attempt) => {
  const startedAt = new Date(attempt.startedAt).getTime()
  const completedAt = new Date(attempt.submittedAt ?? attempt.autosavedAt ?? Date.now()).getTime()

  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) {
    return 0
  }

  return Math.max(0, Math.round((completedAt - startedAt) / 60000))
}

export const getTeacherSubmissionStatus = (attempt) => {
  if (attempt.status === ATTEMPT_STATUSES.inProgress) {
    return TEACHER_SUBMISSION_STATUSES.inProgress
  }

  if (attempt.status === ATTEMPT_STATUSES.expired) {
    return TEACHER_SUBMISSION_STATUSES.expired
  }

  if (attempt.resultsVisible) {
    return TEACHER_SUBMISSION_STATUSES.published
  }

  if (attempt.status === ATTEMPT_STATUSES.graded) {
    return TEACHER_SUBMISSION_STATUSES.graded
  }

  if (attempt.gradingDraftSavedAt) {
    return TEACHER_SUBMISSION_STATUSES.grading
  }

  return TEACHER_SUBMISSION_STATUSES.submitted
}

export const attemptToTeacherSubmission = (attempt, exam) => {
  const questionGrades =
    attempt.scoreBreakdown?.length > 0
      ? attempt.scoreBreakdown
      : buildQuestionGrades(exam, attempt.answers)
  const submission = {
    answers: attempt.answers ?? {},
    completedAt: attempt.submittedAt,
    durationMinutes: calculateAttemptDurationMinutes(attempt),
    examId: exam.id,
    examTitle: exam.title,
    gradedAt: attempt.gradedAt ?? null,
    gradingDraftSavedAt: attempt.gradingDraftSavedAt ?? null,
    id: attempt.id,
    overallFeedback: attempt.teacherFeedback ?? '',
    questionGrades,
    resultsVisible: Boolean(attempt.resultsVisible),
    startedAt: attempt.startedAt,
    status: getTeacherSubmissionStatus(attempt),
    studentId: attempt.studentId,
    studentName: getStudentName(attempt.studentId),
    submittedAt: attempt.submittedAt,
  }

  return {
    ...submission,
    maxScore: getSubmissionMaxScore(submission),
    percentage: getSubmissionPercentage(submission),
    score: getSubmissionScore(submission),
  }
}

export const applyTeacherGradesToAttempt = (
  attempt,
  { overallFeedback = '', questionGrades = [], resultsVisible = false, status },
) => {
  const score = questionGrades.reduce(
    (total, grade) => total + Number(grade.score ?? grade.autoScore ?? 0),
    0,
  )
  const maxScore = questionGrades.reduce(
    (total, grade) => total + Number(grade.maxScore || 0),
    0,
  )
  const now = new Date().toISOString()

  Object.assign(attempt, {
    gradedAt: now,
    maxScore,
    resultsVisible,
    score,
    scoreBreakdown: questionGrades,
    status: status ?? ATTEMPT_STATUSES.graded,
    teacherFeedback: overallFeedback,
  })

  return attempt
}

export const updateStudentScoreRecord = (attempt, exam, student) => {
  mockDb.studentScores = mockDb.studentScores ?? []
  const existingScore = mockDb.studentScores.find((score) => score.id === attempt.id)
  const scoreRecord = {
    answers: Object.entries(attempt.answers ?? {}).map(([questionId, answer]) => ({
      answer,
      isCorrect:
        attempt.scoreBreakdown?.find((item) => item.questionId === questionId)
          ?.isCorrect ?? false,
      questionId,
    })),
    examId: exam.id,
    id: attempt.id,
    maxScore: attempt.maxScore,
    score: attempt.score,
    studentId: student.id,
    studentName: student.name,
    submittedAt: attempt.submittedAt,
  }

  if (existingScore) {
    Object.assign(existingScore, scoreRecord)
  } else {
    mockDb.studentScores.push(scoreRecord)
  }
}

export const persistSharedMockDb = () => {
  syncAllPublishedExamAssignments()
  persistMockDb()
}

// TODO backend: replace these repository helpers with REST resources and
// server-side authorization. Keep service function signatures stable.
