/**
 * Persistent in-browser mock database.
 *
 * The app still talks through service functions, not this object directly.
 * TODO backend: replace this module with real REST resources backed by a database.
 */
import { appConfig } from '../config'
import {
  ATTEMPT_STATUSES,
  EXAM_LIFECYCLE_STATUSES,
  QUESTION_TYPES,
  calculateMaxScore,
} from '../models/examModels'

const DB_VERSION = 3

const isoFromNow = ({ days = 0, hours = 0, minutes = 0 } = {}) =>
  new Date(
    Date.now() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000,
  ).toISOString()

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storage = window.localStorage

    return storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
      ? storage
      : null
  } catch {
    return null
  }
}

const option = (id, label = id) => ({ id, label })

export const createSeedMockDb = () => {
  const teacherId = 'TCH-1'
  const examAvailability = {
    'EX-101': {
      dueAt: isoFromNow({ days: 7 }),
      opensAt: isoFromNow({ days: -10 }),
    },
    'EX-202': {
      dueAt: isoFromNow({ days: 3 }),
      opensAt: isoFromNow({ days: -1 }),
    },
    'EX-303': {
      dueAt: isoFromNow({ hours: 4 }),
      opensAt: isoFromNow({ days: -2 }),
    },
    'EX-404': {
      dueAt: isoFromNow({ days: 8 }),
      opensAt: isoFromNow({ days: 1 }),
    },
    'EX-505': {
      dueAt: isoFromNow({ days: -1 }),
      opensAt: isoFromNow({ days: -10 }),
    },
  }
  let exams = [
    {
      id: 'EX-101',
      title: 'Full Stack Foundations',
      description: 'Covers HTTP, browser storage, React basics, and API boundaries.',
      durationMinutes: 60,
      subject: 'Web Fundamentals',
      difficulty: 'Intermediate',
      createdBy: 'Dr. Cohen',
      createdAt: '2026-04-01T08:00:00Z',
      questions: [
        {
          id: 'Q-101-1',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'Which HTTP method is typically used to create a resource?',
          points: 10,
          options: [option('GET'), option('POST'), option('PATCH'), option('DELETE')],
          correctAnswer: 'POST',
        },
        {
          id: 'Q-101-2',
          type: QUESTION_TYPES.multipleChoice,
          prompt: 'Select the browser APIs commonly used for client-side persistence.',
          points: 10,
          options: [
            option('localStorage'),
            option('sessionStorage'),
            option('CSS media queries'),
            option('Array.prototype.map'),
          ],
          correctAnswers: ['localStorage', 'sessionStorage'],
        },
        {
          id: 'Q-101-3',
          type: QUESTION_TYPES.shortText,
          prompt: 'Name one benefit of separating client and server code.',
          points: 15,
          acceptedKeywords: ['responsibility', 'maintenance', 'separation'],
          sampleAnswer: 'Clear responsibilities make the system easier to maintain.',
        },
        {
          id: 'Q-101-4',
          type: QUESTION_TYPES.longText,
          prompt: 'Explain how form validation improves an exam-taking workflow.',
          points: 15,
          acceptedKeywords: ['invalid', 'feedback', 'submission'],
          sampleAnswer:
            'Validation catches invalid answers early, gives feedback, and reduces failed submissions.',
        },
      ],
    },
    {
      id: 'EX-202',
      title: 'React State and Effects',
      description: 'Assesses component state, props, effects, rendering, and autosave flows.',
      durationMinutes: 45,
      subject: 'React',
      difficulty: 'Intermediate',
      createdBy: 'Prof. Levi',
      createdAt: '2026-04-05T08:00:00Z',
      questions: [
        {
          id: 'Q-202-1',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'Which hook is commonly used to fetch data after render?',
          points: 10,
          options: [
            option('useMemo'),
            option('useEffect'),
            option('useRef'),
            option('useCallback'),
          ],
          correctAnswer: 'useEffect',
        },
        {
          id: 'Q-202-2',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'What should React list items usually include?',
          points: 10,
          options: [
            option('A random number'),
            option('A key prop'),
            option('A class component'),
            option('A reducer'),
          ],
          correctAnswer: 'A key prop',
        },
        {
          id: 'Q-202-3',
          type: QUESTION_TYPES.shortText,
          prompt: 'Write a safe state update that increments a counter.',
          points: 15,
          acceptedKeywords: ['setCount', 'count', '+ 1'],
          sampleAnswer: 'setCount((count) => count + 1)',
        },
        {
          id: 'Q-202-4',
          type: QUESTION_TYPES.longText,
          prompt: 'Describe when an effect cleanup function is useful.',
          points: 15,
          acceptedKeywords: ['subscription', 'timer', 'cleanup'],
          sampleAnswer:
            'Cleanup is useful for timers, subscriptions, and listeners when a component unmounts.',
        },
      ],
    },
    {
      id: 'EX-303',
      title: 'Database and API Design',
      description: 'Focuses on REST resources, validation, authorization, and persistence.',
      durationMinutes: 75,
      subject: 'Backend',
      difficulty: 'Advanced',
      createdBy: 'Ms. Bar',
      createdAt: '2026-04-08T08:00:00Z',
      questions: [
        {
          id: 'Q-303-1',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'Which status code usually means a resource was created?',
          points: 10,
          options: [option('200'), option('201'), option('301'), option('500')],
          correctAnswer: '201',
        },
        {
          id: 'Q-303-2',
          type: QUESTION_TYPES.shortText,
          prompt: 'Why should backend APIs validate incoming request bodies?',
          points: 15,
          acceptedKeywords: ['integrity', 'invalid', 'security'],
          sampleAnswer: 'Validation protects data integrity and rejects invalid input.',
        },
        {
          id: 'Q-303-3',
          type: QUESTION_TYPES.multipleChoice,
          prompt: 'Which concerns belong in backend authorization middleware?',
          points: 15,
          options: [
            option('Verify token'),
            option('Check role'),
            option('Choose button colors'),
            option('Enforce ownership'),
          ],
          correctAnswers: ['Verify token', 'Check role', 'Enforce ownership'],
        },
        {
          id: 'Q-303-4',
          type: QUESTION_TYPES.longText,
          prompt: 'Describe a safe way to connect this frontend to a real REST API later.',
          points: 20,
          acceptedKeywords: ['service', 'token', 'endpoint', 'repository'],
          sampleAnswer:
            'Keep UI code behind services, send bearer tokens, and map REST endpoints to repository functions.',
        },
      ],
    },
    {
      id: 'EX-404',
      title: 'Accessibility and UX',
      description: 'Upcoming exam on semantic HTML, responsive layouts, and feedback states.',
      durationMinutes: 50,
      subject: 'Frontend Quality',
      difficulty: 'Foundational',
      createdBy: 'Dr. Cohen',
      createdAt: '2026-04-12T08:00:00Z',
      questions: [
        {
          id: 'Q-404-1',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'Which attribute connects a form input to its visible label?',
          points: 10,
          options: [option('for'), option('src'), option('href'), option('role')],
          correctAnswer: 'for',
        },
        {
          id: 'Q-404-2',
          type: QUESTION_TYPES.longText,
          prompt: 'Explain why loading and empty states matter.',
          points: 20,
          acceptedKeywords: ['feedback', 'uncertainty', 'state'],
          sampleAnswer: 'They reduce uncertainty and tell the user what state the app is in.',
        },
      ],
    },
    {
      id: 'EX-505',
      title: 'Legacy Browser APIs',
      description: 'Expired practice assessment kept in the dashboard for status coverage.',
      durationMinutes: 30,
      subject: 'Browser APIs',
      difficulty: 'Foundational',
      createdBy: 'Prof. Levi',
      createdAt: '2026-03-20T08:00:00Z',
      questions: [
        {
          id: 'Q-505-1',
          type: QUESTION_TYPES.singleChoice,
          prompt: 'Which API can trigger a browser confirmation before leaving a page?',
          points: 10,
          options: [
            option('beforeunload'),
            option('querySelector'),
            option('fetch'),
            option('requestAnimationFrame'),
          ],
          correctAnswer: 'beforeunload',
        },
      ],
    },
  ]

  exams = exams.map((exam) => ({
    archivedAt: null,
    availability: examAvailability[exam.id],
    instructions:
      'Read each question carefully. Autosave and submission history are enabled.',
    integrityPolicy:
      'Leaving the exam window may be recorded in the activity log for review.',
    maxAttempts: exam.id === 'EX-101' || exam.id === 'EX-303' ? 2 : 1,
    ownerTeacherId: teacherId,
    passingGrade: 70,
    publishedAt: exam.createdAt,
    status: EXAM_LIFECYCLE_STATUSES.published,
    updatedAt: exam.createdAt,
    visibilityScope: 'assigned',
    ...exam,
  }))

  exams.push(
    {
      id: 'EX-DRAFT-1',
      archivedAt: null,
      availability: {
        dueAt: isoFromNow({ days: 12 }),
        opensAt: isoFromNow({ days: 5 }),
      },
      createdAt: isoFromNow({ days: -2 }),
      createdBy: 'Dr. Cohen',
      description: 'Draft assessment used to verify that students cannot see unpublished exams.',
      difficulty: 'Intermediate',
      durationMinutes: 40,
      instructions: 'Draft instructions for the upcoming integrated exam.',
      integrityPolicy: 'Standard activity logging applies.',
      maxAttempts: 1,
      ownerTeacherId: teacherId,
      passingGrade: 70,
      publishedAt: null,
      questions: [
        {
          id: 'Q-DRAFT-1',
          acceptedKeywords: ['shared', 'state', 'service'],
          points: 10,
          prompt: 'Explain why shared service boundaries matter.',
          sampleAnswer: 'Shared services keep teacher and student workflows consistent.',
          type: QUESTION_TYPES.shortText,
        },
      ],
      status: EXAM_LIFECYCLE_STATUSES.draft,
      subject: 'Architecture',
      title: 'Integration Draft Exam',
      updatedAt: isoFromNow({ hours: -5 }),
      visibilityScope: 'assigned',
    },
    {
      id: 'EX-ARCH-1',
      archivedAt: isoFromNow({ days: -3 }),
      availability: {
        dueAt: isoFromNow({ days: -5 }),
        opensAt: isoFromNow({ days: -12 }),
      },
      createdAt: isoFromNow({ days: -20 }),
      createdBy: 'Dr. Cohen',
      description: 'Archived teacher-managed exam retained for analytics and duplication.',
      difficulty: 'Foundational',
      durationMinutes: 30,
      instructions: 'Closed assessment.',
      integrityPolicy: 'Closed assessment.',
      maxAttempts: 1,
      ownerTeacherId: teacherId,
      passingGrade: 60,
      publishedAt: isoFromNow({ days: -15 }),
      questions: [
        {
          id: 'Q-ARCH-1',
          correctAnswer: '201',
          options: [option('200'), option('201'), option('404'), option('500')],
          points: 10,
          prompt: 'Which HTTP code usually indicates creation?',
          type: QUESTION_TYPES.singleChoice,
        },
      ],
      status: EXAM_LIFECYCLE_STATUSES.archived,
      subject: 'Backend',
      title: 'Archived API Check',
      updatedAt: isoFromNow({ days: -3 }),
      visibilityScope: 'assigned',
    },
  )

  const fullStackMaxScore = calculateMaxScore(exams[0].questions)
  const databaseMaxScore = calculateMaxScore(exams[2].questions)

  return normalizeMockDb({
    users: [
      {
        id: 'TCH-1',
        name: 'Dr. Cohen',
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
        createdAt: '2026-04-01T08:00:00Z',
        updatedAt: '2026-04-01T08:00:00Z',
      },
      {
        id: 'STU-12',
        name: 'Maya Rosen',
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
        createdAt: '2026-04-02T08:00:00Z',
        updatedAt: '2026-04-02T08:00:00Z',
      },
      {
        id: 'STU-18',
        name: 'Daniel Amir',
        email: 'daniel@example.com',
        password: 'student123',
        role: 'student',
        createdAt: '2026-04-02T08:00:00Z',
        updatedAt: '2026-04-02T08:00:00Z',
      },
      {
        id: 'STU-25',
        name: 'Noa Katz',
        email: 'noa@example.com',
        password: 'student123',
        role: 'student',
        createdAt: '2026-04-02T08:00:00Z',
        updatedAt: '2026-04-02T08:00:00Z',
      },
    ],
    sessions: [],
    exams,
    examAssignments: [
      {
        id: 'ASN-101-STU-12',
        studentId: 'STU-12',
        examId: 'EX-101',
        opensAt: examAvailability['EX-101'].opensAt,
        dueAt: examAvailability['EX-101'].dueAt,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        instructions:
          'Answer every question before submitting. Objective questions are graded immediately in the mock environment.',
        integrityPolicy:
          'Leaving the exam window may be recorded in the activity log for review.',
      },
      {
        id: 'ASN-202-STU-12',
        studentId: 'STU-12',
        examId: 'EX-202',
        opensAt: examAvailability['EX-202'].opensAt,
        dueAt: examAvailability['EX-202'].dueAt,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        instructions: 'Use concise answers and save your work before submitting.',
        integrityPolicy:
          'Autosave is enabled. Keep this tab active while working on the exam.',
      },
      {
        id: 'ASN-303-STU-12',
        studentId: 'STU-12',
        examId: 'EX-303',
        opensAt: examAvailability['EX-303'].opensAt,
        dueAt: examAvailability['EX-303'].dueAt,
        allowMultipleAttempts: true,
        maxAttempts: 2,
        instructions:
          'Long-answer questions should explain the API boundary and data ownership.',
        integrityPolicy:
          'Drafts are saved automatically. Focus changes are recorded as activity events.',
      },
      {
        id: 'ASN-404-STU-12',
        studentId: 'STU-12',
        examId: 'EX-404',
        opensAt: examAvailability['EX-404'].opensAt,
        dueAt: examAvailability['EX-404'].dueAt,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        instructions: 'This exam opens tomorrow.',
        integrityPolicy: 'Standard activity logging applies.',
      },
      {
        id: 'ASN-505-STU-12',
        studentId: 'STU-12',
        examId: 'EX-505',
        opensAt: examAvailability['EX-505'].opensAt,
        dueAt: examAvailability['EX-505'].dueAt,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        instructions: 'This expired exam can no longer be started.',
        integrityPolicy: 'Closed assessment.',
      },
    ],
    examAttempts: [
      {
        id: 'ATT-101-STU-12-1',
        examId: 'EX-101',
        studentId: 'STU-12',
        attemptNumber: 1,
        status: ATTEMPT_STATUSES.graded,
        startedAt: isoFromNow({ days: -5, hours: -1 }),
        expiresAt: isoFromNow({ days: -5 }),
        autosavedAt: isoFromNow({ days: -5 }),
        submittedAt: isoFromNow({ days: -5 }),
        submittedBy: 'student',
        answers: {
          'Q-101-1': 'POST',
          'Q-101-2': ['localStorage', 'sessionStorage'],
          'Q-101-3': 'Clear responsibilities help maintenance.',
          'Q-101-4':
            'Validation gives feedback before submission and prevents invalid answers.',
        },
        score: 46,
        maxScore: fullStackMaxScore,
        teacherFeedback:
          'Strong submission. The long answer could mention how validation reduces resubmission loops.',
        scoreBreakdown: [
          {
            questionId: 'Q-101-1',
            score: 10,
            maxScore: 10,
            isCorrect: true,
            feedback: 'Correct answer.',
          },
          {
            questionId: 'Q-101-2',
            score: 10,
            maxScore: 10,
            isCorrect: true,
            feedback: 'Correct selection.',
          },
          {
            questionId: 'Q-101-3',
            score: 13,
            maxScore: 15,
            isCorrect: true,
            feedback: 'Clear and concise answer.',
          },
          {
            questionId: 'Q-101-4',
            score: 13,
            maxScore: 15,
            isCorrect: true,
            feedback: 'Good explanation with room for more detail.',
          },
        ],
        activityLog: [
          {
            id: 'ACT-101-1',
            type: 'started',
            message: 'Exam started.',
            createdAt: isoFromNow({ days: -5, hours: -1 }),
          },
          {
            id: 'ACT-101-2',
            type: 'submitted',
            message: 'Exam submitted by student.',
            createdAt: isoFromNow({ days: -5 }),
          },
        ],
      },
      {
        id: 'ATT-303-STU-12-1',
        examId: 'EX-303',
        studentId: 'STU-12',
        attemptNumber: 1,
        status: ATTEMPT_STATUSES.inProgress,
        startedAt: isoFromNow({ minutes: -18 }),
        expiresAt: isoFromNow({ minutes: 42 }),
        autosavedAt: isoFromNow({ minutes: -2 }),
        submittedAt: null,
        submittedBy: null,
        answers: {
          'Q-303-1': '201',
          'Q-303-2': 'Validation protects integrity and rejects invalid payloads.',
        },
        score: null,
        maxScore: databaseMaxScore,
        teacherFeedback: '',
        scoreBreakdown: [],
        activityLog: [
          {
            id: 'ACT-303-1',
            type: 'started',
            message: 'Exam started.',
            createdAt: isoFromNow({ minutes: -18 }),
          },
          {
            id: 'ACT-303-2',
            type: 'autosaved',
            message: 'Draft saved.',
            createdAt: isoFromNow({ minutes: -2 }),
          },
        ],
      },
    ],
    studentScores: [
      {
        id: 'SC-9001',
        studentId: 'STU-12',
        studentName: 'Maya Rosen',
        examId: 'EX-101',
        score: 46,
        maxScore: fullStackMaxScore,
        submittedAt: isoFromNow({ days: -5 }),
        answers: [
          { questionId: 'Q-101-1', answer: 'POST', isCorrect: true },
          {
            questionId: 'Q-101-2',
            answer: ['localStorage', 'sessionStorage'],
            isCorrect: true,
          },
        ],
      },
      {
        id: 'SC-9002',
        studentId: 'STU-18',
        studentName: 'Daniel Amir',
        examId: 'EX-202',
        score: 37,
        maxScore: 50,
        submittedAt: isoFromNow({ days: -3 }),
        answers: [
          { questionId: 'Q-202-1', answer: 'useEffect', isCorrect: true },
          { questionId: 'Q-202-2', answer: 'A key prop', isCorrect: true },
        ],
      },
      {
        id: 'SC-9003',
        studentId: 'STU-25',
        studentName: 'Noa Katz',
        examId: 'EX-303',
        score: 52,
        maxScore: databaseMaxScore,
        submittedAt: isoFromNow({ days: -2 }),
        answers: [
          { questionId: 'Q-303-1', answer: '201', isCorrect: true },
          {
            questionId: 'Q-303-2',
            answer: 'To prevent malformed data from being saved',
            isCorrect: true,
          },
        ],
      },
    ],
    examTemplates: [
      {
        id: 'TPL-QUIZ',
        description: 'Short timed quiz with objective questions.',
        title: 'Quick Quiz',
      },
      {
        id: 'TPL-FINAL',
        description: 'Mixed question assessment with manual grading.',
        title: 'Final Exam',
      },
    ],
    notifications: [],
    teacherActivity: [
      {
        id: 'TACT-SEED-1',
        createdAt: isoFromNow({ hours: -2 }),
        message: 'Maya Rosen has an in-progress attempt for Database and API Design.',
        targetId: 'ATT-303-STU-12-1',
        type: 'submission',
      },
      {
        id: 'TACT-SEED-2',
        createdAt: isoFromNow({ days: -1 }),
        message: 'Published Full Stack Foundations.',
        targetId: 'EX-101',
        type: 'publish',
      },
    ],
  })
}

function getDefaultTeacherId(data) {
  return data.users?.find((user) => user.role === 'teacher')?.id ?? 'TCH-1'
}

function buildLegacyAttemptFromSubmission(submission, exam) {
  const score = (submission.questionGrades ?? []).reduce(
    (total, grade) => total + Number(grade.score ?? grade.autoScore ?? 0),
    0,
  )
  const maxScore = (submission.questionGrades ?? []).reduce(
    (total, grade) => total + Number(grade.maxScore || 0),
    0,
  )

  return {
    activityLog: [
      {
        id: `ACT-${submission.id}`,
        createdAt: submission.submittedAt,
        message: 'Legacy teacher submission imported into shared attempts.',
        type: 'submitted',
      },
    ],
    answers: submission.answers ?? {},
    attemptNumber: 1,
    autosavedAt: submission.completedAt ?? submission.submittedAt,
    examId: exam.id,
    expiresAt: submission.completedAt ?? submission.submittedAt,
    gradedAt: submission.gradedAt ?? null,
    gradingDraftSavedAt: submission.gradingDraftSavedAt ?? null,
    id: submission.id,
    maxScore,
    resultsVisible: Boolean(submission.resultsVisible),
    score,
    scoreBreakdown: submission.questionGrades ?? [],
    startedAt: submission.startedAt,
    status:
      submission.resultsVisible || submission.status === 'published'
        ? ATTEMPT_STATUSES.graded
        : submission.status === 'graded'
          ? ATTEMPT_STATUSES.graded
          : ATTEMPT_STATUSES.submitted,
    studentId: submission.studentId,
    submittedAt: submission.submittedAt,
    submittedBy: 'student',
    teacherFeedback: submission.overallFeedback ?? '',
  }
}

export function normalizeMockDb(data) {
  const nextDb = {
    examAssignments: [],
    examAttempts: [],
    examTemplates: [],
    exams: [],
    notifications: [],
    sessions: [],
    studentScores: [],
    teacherActivity: [],
    users: [],
    ...data,
  }
  const teacherId = getDefaultTeacherId(nextDb)
  const teacherName =
    nextDb.users.find((user) => user.id === teacherId)?.name ?? 'Teacher'

  if (Array.isArray(nextDb.teacherExams)) {
    nextDb.teacherExams.forEach((teacherExam) => {
      if (nextDb.exams.some((exam) => exam.id === teacherExam.id)) {
        return
      }

      nextDb.exams.push({
        createdBy: teacherName,
        difficulty: 'Intermediate',
        subject: 'Teacher Managed',
        visibilityScope: 'assigned',
        ...teacherExam,
      })
    })
  }

  nextDb.exams = nextDb.exams.map((exam) => {
    const ownerTeacherId = exam.ownerTeacherId ?? teacherId
    const assignment = nextDb.examAssignments.find((item) => item.examId === exam.id)
    const availability = {
      dueAt:
        exam.availability?.dueAt ??
        assignment?.dueAt ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      opensAt:
        exam.availability?.opensAt ??
        assignment?.opensAt ??
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    const status =
      exam.status ??
      (exam.archivedAt
        ? EXAM_LIFECYCLE_STATUSES.archived
        : EXAM_LIFECYCLE_STATUSES.published)

    return {
      ...exam,
      archivedAt: exam.archivedAt ?? null,
      availability,
      createdBy: exam.createdBy ?? teacherName,
      createdAt: exam.createdAt ?? new Date().toISOString(),
      difficulty: exam.difficulty ?? 'Foundational',
      instructions:
        exam.instructions ??
        assignment?.instructions ??
        'Read each question carefully and submit before the due date.',
      integrityPolicy:
        exam.integrityPolicy ??
        assignment?.integrityPolicy ??
        'Autosave is enabled. Teachers can review progress and submission activity.',
      maxAttempts: Number(exam.maxAttempts ?? assignment?.maxAttempts ?? 1),
      ownerTeacherId,
      passingGrade: Number(exam.passingGrade ?? 70),
      publishedAt:
        exam.publishedAt ??
        (status === EXAM_LIFECYCLE_STATUSES.published ? exam.createdAt : null),
      status,
      subject: exam.subject ?? 'General',
      updatedAt: exam.updatedAt ?? exam.createdAt ?? new Date().toISOString(),
      visibilityScope: exam.visibilityScope ?? 'assigned',
    }
  })

  if (Array.isArray(nextDb.teacherSubmissions)) {
    nextDb.teacherSubmissions.forEach((submission) => {
      if (nextDb.examAttempts.some((attempt) => attempt.id === submission.id)) {
        return
      }

      const exam = nextDb.exams.find((item) => item.id === submission.examId)

      if (exam) {
        nextDb.examAttempts.push(buildLegacyAttemptFromSubmission(submission, exam))
      }
    })
  }

  nextDb.studentScores.forEach((score) => {
    if (
      nextDb.examAttempts.some(
        (attempt) =>
          attempt.id === score.id ||
          (attempt.studentId === score.studentId &&
            attempt.examId === score.examId &&
            attempt.status === ATTEMPT_STATUSES.graded),
      )
    ) {
      return
    }

    const exam = nextDb.exams.find((item) => item.id === score.examId)
    const student = nextDb.users.find((user) => user.id === score.studentId)

    if (!exam || !student) {
      return
    }

    const answers = Object.fromEntries(
      (score.answers ?? []).map((answer) => [answer.questionId, answer.answer]),
    )
    const answeredMaxScore = (exam.questions ?? []).reduce(
      (total, question) =>
        answers[question.id] === undefined ? total : total + Number(question.points || 0),
      0,
    )

    nextDb.examAttempts.push({
      activityLog: [
        {
          id: `ACT-${score.id}`,
          createdAt: score.submittedAt,
          message: 'Legacy score imported into shared attempts.',
          type: 'submitted',
        },
      ],
      answers,
      attemptNumber: 1,
      autosavedAt: score.submittedAt,
      examId: score.examId,
      expiresAt: score.submittedAt,
      gradedAt: score.submittedAt,
      gradingDraftSavedAt: null,
      id: score.id,
      maxScore: score.maxScore,
      resultsVisible: true,
      score: score.score,
      scoreBreakdown: (exam.questions ?? []).map((question) => {
        const answer = answers[question.id]
        const importedScore =
          answer === undefined || answeredMaxScore <= 0
            ? 0
            : Math.round((Number(score.score || 0) * Number(question.points || 0)) / answeredMaxScore)

        return {
          answer: answer ?? '',
          feedback: answer === undefined ? 'No answer submitted.' : 'Imported graded answer.',
          isCorrect:
            score.answers?.find((item) => item.questionId === question.id)?.isCorrect ??
            false,
          maxScore: Number(question.points || 0),
          overridden: false,
          questionId: question.id,
          score: importedScore,
        }
      }),
      startedAt: score.submittedAt,
      status: ATTEMPT_STATUSES.graded,
      studentId: score.studentId,
      submittedAt: score.submittedAt,
      submittedBy: 'student',
      teacherFeedback: 'Imported graded score.',
    })
  })

  nextDb.examAttempts = nextDb.examAttempts.map((attempt) => {
    const exam = nextDb.exams.find((item) => item.id === attempt.examId)
    const scoreBreakdown = attempt.scoreBreakdown ?? []
    const maxScore =
      Number(attempt.maxScore) ||
      (exam ? calculateMaxScore(exam.questions ?? []) : 0)

    return {
      ...attempt,
      activityLog: attempt.activityLog ?? [],
      answers: attempt.answers ?? {},
      attemptNumber: Number(attempt.attemptNumber ?? 1),
      autosavedAt: attempt.autosavedAt ?? attempt.startedAt,
      expiresAt: attempt.expiresAt ?? attempt.submittedAt ?? attempt.startedAt,
      gradedAt: attempt.gradedAt ?? (attempt.status === ATTEMPT_STATUSES.graded ? attempt.submittedAt : null),
      gradingDraftSavedAt: attempt.gradingDraftSavedAt ?? null,
      maxScore,
      resultsVisible:
        attempt.resultsVisible ?? attempt.status === ATTEMPT_STATUSES.graded,
      score: attempt.score ?? null,
      scoreBreakdown,
      submittedAt: attempt.submittedAt ?? null,
      submittedBy: attempt.submittedBy ?? null,
      teacherFeedback: attempt.teacherFeedback ?? '',
    }
  })

  nextDb.notifications = Array.isArray(nextDb.notifications) ? nextDb.notifications : []
  nextDb.teacherActivity = Array.isArray(nextDb.teacherActivity)
    ? nextDb.teacherActivity
    : []
  nextDb.examTemplates = Array.isArray(nextDb.examTemplates)
    ? nextDb.examTemplates
    : [
        {
          id: 'TPL-QUIZ',
          description: 'Short timed quiz with objective questions.',
          title: 'Quick Quiz',
        },
      ]

  const publishedExams = nextDb.exams.filter(
    (exam) => exam.status === EXAM_LIFECYCLE_STATUSES.published && !exam.archivedAt,
  )
  const students = nextDb.users.filter((user) => user.role === 'student')

  publishedExams.forEach((exam) => {
    students.forEach((student) => {
      const existingAssignment = nextDb.examAssignments.find(
        (assignment) =>
          assignment.examId === exam.id && assignment.studentId === student.id,
      )
      const assignment = {
        allowMultipleAttempts: Number(exam.maxAttempts ?? 1) > 1,
        dueAt: exam.availability.dueAt,
        examId: exam.id,
        integrityPolicy: exam.integrityPolicy,
        instructions: exam.instructions,
        maxAttempts: Number(exam.maxAttempts ?? 1),
        opensAt: exam.availability.opensAt,
        studentId: student.id,
      }

      if (existingAssignment) {
        Object.assign(existingAssignment, assignment)
      } else {
        nextDb.examAssignments.push({
          ...assignment,
          id: `ASN-${exam.id}-${student.id}`,
        })
      }
    })
  })

  delete nextDb.teacherExams
  delete nextDb.teacherSubmissions

  return nextDb
}

const loadMockDb = () => {
  const storage = getStorage()

  if (!storage) {
    return createSeedMockDb()
  }

  try {
    const raw = storage.getItem(appConfig.mock.dbStorageKey)
    const parsed = raw ? JSON.parse(raw) : null

    if (parsed?.data?.users && parsed?.data?.exams) {
      return normalizeMockDb(parsed.data)
    }
  } catch {
    storage.removeItem(appConfig.mock.dbStorageKey)
  }

  return createSeedMockDb()
}

export const mockDb = loadMockDb()

export const persistMockDb = () => {
  const storage = getStorage()

  if (!storage) {
    return
  }

  if (!appConfig.mock.persistDb) {
    return
  }

  storage.setItem(
    appConfig.mock.dbStorageKey,
    JSON.stringify({
      data: mockDb,
      version: DB_VERSION,
    }),
  )
}

export const resetMockDb = () => {
  const nextDb = createSeedMockDb()

  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key]
  })
  Object.assign(mockDb, nextDb)
  persistMockDb()
}
