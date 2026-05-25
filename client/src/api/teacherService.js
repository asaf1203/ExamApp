/**
 * Teacher exam-management service facade.
 *
 * Components depend on this module, not mockDb. The HTTP paths mirror future
 * REST resources for multi-teacher exam management and grading.
 */
import { ApiError, apiClient, mockRequest } from './apiClient'
import { USER_ROLES, requireMockRole } from './authService'
import { mockDb, persistMockDb } from './mockDb'
import { appConfig } from '../config'
import {
  QUESTION_TYPES,
  gradeQuestionAnswer,
  normalizeOptions,
} from '../models/examModels'
import {
  TEACHER_EXAM_FILTERS,
  TEACHER_EXAM_STATUSES,
  TEACHER_SUBMISSION_STATUSES,
  createEmptyTeacherExam,
  createEmptyTeacherQuestion,
  getSubmissionMaxScore,
  getSubmissionPercentage,
  getSubmissionScore,
  getTeacherExamMaxScore,
} from '../models/teacherModels'

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

const clone = (value) => structuredClone(value)

const isoFromNow = ({ days = 0, hours = 0, minutes = 0 } = {}) =>
  new Date(
    Date.now() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000,
  ).toISOString()

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

const option = (id, label = id) => ({ id, label })

const seedQuestion = (id, type, prompt, points, extra = {}) => ({
  id,
  attachments: [],
  explanation: extra.explanation ?? '',
  points,
  prompt,
  required: extra.required ?? true,
  type,
  ...extra,
})

const buildQuestionGrades = (exam, answers) =>
  exam.questions.map((question) => {
    const grade = gradeQuestionAnswer(question, answers?.[question.id])

    return {
      autoScore: grade.score,
      feedback: grade.feedback,
      isCorrect: grade.isCorrect,
      maxScore: grade.maxScore,
      overridden: false,
      questionId: question.id,
      score: grade.score,
    }
  })

const createTeacherSubmission = ({
  answers,
  completedMinutes,
  exam,
  id,
  status = TEACHER_SUBMISSION_STATUSES.submitted,
  studentId,
  studentName,
  submittedOffset,
}) => {
  const submittedAt = isoFromNow(submittedOffset)
  const startedAt = isoFromNow({
    days: submittedOffset.days ?? 0,
    hours: submittedOffset.hours ?? 0,
    minutes: (submittedOffset.minutes ?? 0) - completedMinutes,
  })
  const questionGrades = buildQuestionGrades(exam, answers)

  return {
    id,
    answers,
    completedAt: submittedAt,
    durationMinutes: completedMinutes,
    examId: exam.id,
    gradingDraftSavedAt: null,
    overallFeedback: '',
    questionGrades,
    resultsVisible: status === TEACHER_SUBMISSION_STATUSES.published,
    startedAt,
    status,
    studentId,
    studentName,
    submittedAt,
  }
}

const seedTeacherExams = (teacherId) => {
  const exams = [
    {
      id: 'TEX-101',
      archivedAt: null,
      availability: {
        dueAt: isoFromNow({ days: 9 }),
        opensAt: isoFromNow({ days: -2 }),
      },
      createdAt: isoFromNow({ days: -18 }),
      description:
        'Assessment covering REST boundaries, frontend state, and resilient UI flows.',
      durationMinutes: 75,
      instructions:
        'Students must complete all questions. Autosave and timer behavior are enabled.',
      maxAttempts: 2,
      ownerTeacherId: teacherId,
      passingGrade: 70,
      publishedAt: isoFromNow({ days: -5 }),
      questions: [
        seedQuestion(
          'TQ-101-1',
          QUESTION_TYPES.singleChoice,
          'Which layer should own API retry and timeout behavior?',
          10,
          {
            correctAnswer: 'API client',
            options: [
              option('API client'),
              option('Page component'),
              option('CSS file'),
              option('Route label'),
            ],
          },
        ),
        seedQuestion(
          'TQ-101-2',
          QUESTION_TYPES.multipleChoice,
          'Select backend-ready frontend concerns.',
          15,
          {
            correctAnswers: ['Service boundary', 'Token storage', 'Error mapping'],
            options: [
              option('Service boundary'),
              option('Token storage'),
              option('Hard-coded mock imports'),
              option('Error mapping'),
            ],
          },
        ),
        seedQuestion(
          'TQ-101-3',
          QUESTION_TYPES.longText,
          'Explain how route guards and backend authorization should work together.',
          25,
          {
            acceptedKeywords: ['guard', 'server', 'role'],
            sampleAnswer:
              'Client guards protect UX; backend middleware enforces token and role permissions.',
          },
        ),
      ],
      status: TEACHER_EXAM_STATUSES.published,
      title: 'Production Frontend Architecture',
      updatedAt: isoFromNow({ days: -1 }),
    },
    {
      id: 'TEX-202',
      archivedAt: null,
      availability: {
        dueAt: isoFromNow({ days: 14 }),
        opensAt: isoFromNow({ days: 4 }),
      },
      createdAt: isoFromNow({ days: -4 }),
      description: 'Draft exam for React state, effects, and controlled forms.',
      durationMinutes: 60,
      instructions: 'Draft instructions for the upcoming React exam.',
      maxAttempts: 1,
      ownerTeacherId: teacherId,
      passingGrade: 65,
      publishedAt: null,
      questions: [
        seedQuestion(
          'TQ-202-1',
          QUESTION_TYPES.shortText,
          'What makes a controlled form field controlled?',
          10,
          {
            acceptedKeywords: ['value', 'state', 'onChange'],
            sampleAnswer: 'The value is driven by state and updated through onChange.',
          },
        ),
      ],
      status: TEACHER_EXAM_STATUSES.draft,
      title: 'React State Workshop',
      updatedAt: isoFromNow({ hours: -6 }),
    },
    {
      id: 'TEX-303',
      archivedAt: isoFromNow({ days: -8 }),
      availability: {
        dueAt: isoFromNow({ days: -15 }),
        opensAt: isoFromNow({ days: -25 }),
      },
      createdAt: isoFromNow({ days: -40 }),
      description: 'Archived API design quiz kept for analytics and duplication.',
      durationMinutes: 35,
      instructions: 'Closed assessment.',
      maxAttempts: 1,
      ownerTeacherId: teacherId,
      passingGrade: 60,
      publishedAt: isoFromNow({ days: -30 }),
      questions: [
        seedQuestion(
          'TQ-303-1',
          QUESTION_TYPES.singleChoice,
          'Which HTTP response code indicates validation failure?',
          10,
          {
            correctAnswer: '422',
            options: [option('200'), option('201'), option('422'), option('500')],
          },
        ),
      ],
      status: TEACHER_EXAM_STATUSES.archived,
      title: 'API Design Quiz',
      updatedAt: isoFromNow({ days: -8 }),
    },
  ]

  const submissions = [
    createTeacherSubmission({
      answers: {
        'TQ-101-1': 'API client',
        'TQ-101-2': ['Service boundary', 'Token storage', 'Error mapping'],
        'TQ-101-3':
          'Client guard handles navigation while the server checks token role and ownership.',
      },
      completedMinutes: 48,
      exam: exams[0],
      id: 'TSUB-101-1',
      status: TEACHER_SUBMISSION_STATUSES.graded,
      studentId: 'STU-12',
      studentName: 'Maya Rosen',
      submittedOffset: { days: -1, hours: -3 },
    }),
    createTeacherSubmission({
      answers: {
        'TQ-101-1': 'Page component',
        'TQ-101-2': ['Service boundary', 'Hard-coded mock imports'],
        'TQ-101-3': 'The guard checks users.',
      },
      completedMinutes: 55,
      exam: exams[0],
      id: 'TSUB-101-2',
      status: TEACHER_SUBMISSION_STATUSES.submitted,
      studentId: 'STU-18',
      studentName: 'Daniel Amir',
      submittedOffset: { hours: -7 },
    }),
    createTeacherSubmission({
      answers: {
        'TQ-101-1': 'API client',
        'TQ-101-2': ['Service boundary', 'Token storage'],
        'TQ-101-3':
          'Routes keep the UI in the right place and backend authorization prevents forbidden access.',
      },
      completedMinutes: 41,
      exam: exams[0],
      id: 'TSUB-101-3',
      status: TEACHER_SUBMISSION_STATUSES.published,
      studentId: 'STU-25',
      studentName: 'Noa Katz',
      submittedOffset: { days: -2, hours: -2 },
    }),
  ]

  submissions[0].overallFeedback = 'Good work. The long answer is concise and accurate.'
  submissions[2].overallFeedback = 'Published result. Strong API boundary explanation.'

  return { exams, submissions }
}

const ensureTeacherMockData = (teacherId) => {
  if (!Array.isArray(mockDb.teacherExams) || !Array.isArray(mockDb.teacherSubmissions)) {
    const seed = seedTeacherExams(teacherId)
    mockDb.teacherExams = seed.exams
    mockDb.teacherSubmissions = seed.submissions
  }

  if (!Array.isArray(mockDb.teacherActivity)) {
    mockDb.teacherActivity = [
      {
        id: 'TACT-1',
        createdAt: isoFromNow({ hours: -2 }),
        message: 'Saved grading draft for Daniel Amir.',
        targetId: 'TSUB-101-2',
        type: 'grading',
      },
      {
        id: 'TACT-2',
        createdAt: isoFromNow({ hours: -6 }),
        message: 'Updated React State Workshop draft.',
        targetId: 'TEX-202',
        type: 'exam',
      },
      {
        id: 'TACT-3',
        createdAt: isoFromNow({ days: -1 }),
        message: 'Published Production Frontend Architecture.',
        targetId: 'TEX-101',
        type: 'publish',
      },
    ]
  }

  if (!Array.isArray(mockDb.examTemplates)) {
    mockDb.examTemplates = [
      {
        id: 'TPL-QUIZ',
        description: 'Short timed quiz with one section and objective questions.',
        title: 'Quick Quiz',
      },
      {
        id: 'TPL-FINAL',
        description: 'Longer assessment with mixed question types and manual grading.',
        title: 'Final Exam',
      },
    ]
  }

  persistMockDb()
}

const appendTeacherActivity = (type, message, targetId) => {
  mockDb.teacherActivity = mockDb.teacherActivity ?? []
  mockDb.teacherActivity.unshift({
    id: createId('TACT'),
    createdAt: new Date().toISOString(),
    message,
    targetId,
    type,
  })
}

const getTeacher = () => {
  const teacher = requireMockRole(USER_ROLES.teacher)
  ensureTeacherMockData(teacher.id)
  return teacher
}

const getTeacherExams = (teacherId) =>
  (mockDb.teacherExams ?? []).filter((exam) => exam.ownerTeacherId === teacherId)

const findTeacherExam = (teacherId, examId) => {
  const exam = getTeacherExams(teacherId).find((item) => item.id === examId)

  if (!exam) {
    throw new ApiError('Teacher exam was not found.', {
      code: 'TEACHER_EXAM_NOT_FOUND',
      status: 404,
    })
  }

  return exam
}

const findTeacherSubmission = (teacherId, submissionId) => {
  const examIds = new Set(getTeacherExams(teacherId).map((exam) => exam.id))
  const submission = (mockDb.teacherSubmissions ?? []).find(
    (item) => item.id === submissionId && examIds.has(item.examId),
  )

  if (!submission) {
    throw new ApiError('Submission was not found.', {
      code: 'TEACHER_SUBMISSION_NOT_FOUND',
      status: 404,
    })
  }

  return submission
}

const enrichExam = (exam) => {
  const submissions = (mockDb.teacherSubmissions ?? []).filter(
    (submission) => submission.examId === exam.id,
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
  const exams = getTeacherExams(teacherId).map(enrichExam)
  const submissions = (mockDb.teacherSubmissions ?? []).filter((submission) =>
    exams.some((exam) => exam.id === submission.examId),
  )
  const query = String(params.search ?? '').trim().toLowerCase()
  const status = params.status ?? TEACHER_EXAM_FILTERS.all
  const filteredExams = exams.filter((exam) => {
    const matchesStatus = status === TEACHER_EXAM_FILTERS.all || exam.status === status
    const matchesQuery =
      !query ||
      [exam.title, exam.description, exam.instructions].some((value) =>
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
      .slice(0, 5),
    stats: {
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

const paginate = (items, page = 1, pageSize = 20) => {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 20)
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: items.length,
  }
}

const normalizeExamPayload = (payload, teacherId) => {
  const now = new Date().toISOString()
  const nextExam = {
    ...createEmptyTeacherExam(teacherId),
    ...payload,
    availability: {
      dueAt: fromLocalDateTimeInput(payload.availability?.dueAt) || payload.availability?.dueAt || '',
      opensAt:
        fromLocalDateTimeInput(payload.availability?.opensAt) ||
        payload.availability?.opensAt ||
        '',
    },
    durationMinutes: Number(payload.durationMinutes || 60),
    maxAttempts: Number(payload.maxAttempts || 1),
    passingGrade: Number(payload.passingGrade || 70),
    questions: (payload.questions ?? []).map((question, index) => ({
      ...question,
      id: question.id || createId(`TQ-${index + 1}`),
      options: question.options ? normalizeOptions(question) : undefined,
      points: Number(question.points || 0),
      required: Boolean(question.required),
    })),
    updatedAt: now,
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
      id: createId('TEX'),
      ownerTeacherId: teacher.id,
      status: TEACHER_EXAM_STATUSES.draft,
      title: payload.title || 'Untitled Exam',
      updatedAt: now,
    }

    mockDb.teacherExams.unshift(baseExam)
    appendTeacherActivity('exam', `Created ${baseExam.title}.`, baseExam.id)
    persistMockDb()

    return toEditorExam(enrichExam(baseExam))
  })

const saveTeacherExamMock = (examId, payload, { autosave = false } = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)
    const mergedExam = {
      ...existingExam,
      ...payload,
      availability: {
        ...existingExam.availability,
        ...payload.availability,
      },
      id: existingExam.id,
      ownerTeacherId: teacher.id,
      status: payload.status ?? existingExam.status,
    }
    const normalizedExam = autosave
      ? {
          ...mergedExam,
          availability: {
            dueAt:
              fromLocalDateTimeInput(mergedExam.availability?.dueAt) ||
              mergedExam.availability?.dueAt ||
              '',
            opensAt:
              fromLocalDateTimeInput(mergedExam.availability?.opensAt) ||
              mergedExam.availability?.opensAt ||
              '',
          },
          durationMinutes: Number(mergedExam.durationMinutes || 60),
          maxAttempts: Number(mergedExam.maxAttempts || 1),
          passingGrade: Number(mergedExam.passingGrade || 70),
          questions: (mergedExam.questions ?? []).map((question, index) => ({
            ...question,
            id: question.id || createId(`TQ-${index + 1}`),
            options: question.options ? normalizeOptions(question) : undefined,
            points: Number(question.points || 0),
            required: Boolean(question.required),
          })),
          updatedAt: new Date().toISOString(),
        }
      : normalizeExamPayload(mergedExam, teacher.id)

    Object.assign(existingExam, normalizedExam, {
      autosavedAt: autosave ? new Date().toISOString() : existingExam.autosavedAt,
      createdAt: existingExam.createdAt,
      id: existingExam.id,
    })

    appendTeacherActivity(
      'exam',
      autosave ? `Autosaved ${existingExam.title}.` : `Saved ${existingExam.title}.`,
      existingExam.id,
    )
    persistMockDb()

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

    mockDb.teacherExams = mockDb.teacherExams.filter((exam) => exam.id !== examId)
    mockDb.teacherSubmissions = (mockDb.teacherSubmissions ?? []).filter(
      (submission) => submission.examId !== examId,
    )
    appendTeacherActivity('exam', `Deleted ${existingExam.title}.`, examId)
    persistMockDb()

    return { success: true }
  })

const duplicateTeacherExamMock = (examId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const existingExam = findTeacherExam(teacher.id, examId)
    const now = new Date().toISOString()
    const duplicate = {
      ...clone(existingExam),
      archivedAt: null,
      createdAt: now,
      id: createId('TEX'),
      publishedAt: null,
      questions: existingExam.questions.map((question, index) => ({
        ...clone(question),
        id: createId(`TQ-${index + 1}`),
      })),
      status: TEACHER_EXAM_STATUSES.draft,
      title: `${existingExam.title} Copy`,
      updatedAt: now,
    }

    mockDb.teacherExams.unshift(duplicate)
    appendTeacherActivity('exam', `Duplicated ${existingExam.title}.`, duplicate.id)
    persistMockDb()

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
    }

    if (status === TEACHER_EXAM_STATUSES.draft) {
      existingExam.publishedAt = null
      existingExam.archivedAt = null
    }

    if (status === TEACHER_EXAM_STATUSES.archived) {
      existingExam.archivedAt = now
    }

    existingExam.status = status
    existingExam.updatedAt = now
    appendTeacherActivity('publish', `${status} ${existingExam.title}.`, existingExam.id)
    persistMockDb()

    return toEditorExam(enrichExam(existingExam))
  })

const listTeacherSubmissionsMock = (params = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const exams = getTeacherExams(teacher.id)
    const examIds = new Set(exams.map((exam) => exam.id))
    const query = String(params.search ?? '').trim().toLowerCase()
    const status = params.status ?? 'all'
    const examId = params.examId ?? 'all'
    const submissions = (mockDb.teacherSubmissions ?? [])
      .filter((submission) => examIds.has(submission.examId))
      .filter((submission) => examId === 'all' || submission.examId === examId)
      .filter((submission) => status === 'all' || submission.status === status)
      .filter((submission) => {
        const exam = exams.find((item) => item.id === submission.examId)
        return (
          !query ||
          [submission.studentName, submission.id, exam?.title].some((value) =>
            String(value ?? '').toLowerCase().includes(query),
          )
        )
      })
      .map((submission) => {
        const exam = exams.find((item) => item.id === submission.examId)

        return {
          ...submission,
          examTitle: exam?.title ?? submission.examId,
          maxScore: getSubmissionMaxScore(submission),
          percentage: getSubmissionPercentage(submission),
          score: getSubmissionScore(submission),
        }
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

    return paginate(submissions, params.page, params.pageSize)
  })

const getTeacherSubmissionMock = (submissionId) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const submission = findTeacherSubmission(teacher.id, submissionId)
    const exam = findTeacherExam(teacher.id, submission.examId)
    const submissions = (mockDb.teacherSubmissions ?? []).filter(
      (item) => item.examId === submission.examId,
    )

    return {
      exam,
      nextSubmissionId:
        submissions[submissions.findIndex((item) => item.id === submission.id) + 1]?.id ??
        null,
      previousSubmissionId:
        submissions[submissions.findIndex((item) => item.id === submission.id) - 1]?.id ??
        null,
      submission: {
        ...submission,
        maxScore: getSubmissionMaxScore(submission),
        percentage: getSubmissionPercentage(submission),
        score: getSubmissionScore(submission),
      },
    }
  })

const saveTeacherSubmissionGradesMock = (submissionId, payload = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const submission = findTeacherSubmission(teacher.id, submissionId)

    submission.questionGrades = payload.questionGrades ?? submission.questionGrades
    submission.overallFeedback = payload.overallFeedback ?? submission.overallFeedback
    submission.gradingDraftSavedAt = new Date().toISOString()
    submission.status = TEACHER_SUBMISSION_STATUSES.grading
    appendTeacherActivity('grading', `Saved grading draft for ${submission.studentName}.`, submission.id)
    persistMockDb()

    return submission
  })

const updateTeacherSubmissionStatusMock = (submissionId, status, payload = {}) =>
  mockRequest(() => {
    const teacher = getTeacher()
    const submission = findTeacherSubmission(teacher.id, submissionId)

    if (payload.questionGrades) {
      submission.questionGrades = payload.questionGrades
    }

    if (payload.overallFeedback !== undefined) {
      submission.overallFeedback = payload.overallFeedback
    }

    submission.status = status
    submission.resultsVisible = status === TEACHER_SUBMISSION_STATUSES.published
    submission.gradedAt = new Date().toISOString()
    appendTeacherActivity(
      'grading',
      status === TEACHER_SUBMISSION_STATUSES.published
        ? `Published grades for ${submission.studentName}.`
        : `Marked grading complete for ${submission.studentName}.`,
      submission.id,
    )
    persistMockDb()

    return submission
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
        TEACHER_SUBMISSION_STATUSES.graded,
        payload,
      )
    : apiClient.post(`/teacher/submissions/${encodeURIComponent(submissionId)}/hide`, payload)

export const createTeacherQuestion = createEmptyTeacherQuestion
