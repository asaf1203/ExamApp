/**
 * Persistent in-browser mock database.
 *
 * The app still talks through service functions, not this object directly.
 * TODO backend: replace this module with real REST resources backed by a database.
 */
import { appConfig } from '../config'
import {
  ATTEMPT_STATUSES,
  QUESTION_TYPES,
  calculateMaxScore,
} from '../models/examModels'

const DB_VERSION = 2

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
  const exams = [
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

  const fullStackMaxScore = calculateMaxScore(exams[0].questions)
  const databaseMaxScore = calculateMaxScore(exams[2].questions)

  return {
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
        opensAt: isoFromNow({ days: -10 }),
        dueAt: isoFromNow({ days: 7 }),
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
        opensAt: isoFromNow({ days: -1 }),
        dueAt: isoFromNow({ days: 3 }),
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
        opensAt: isoFromNow({ days: -2 }),
        dueAt: isoFromNow({ hours: 4 }),
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
        opensAt: isoFromNow({ days: 1 }),
        dueAt: isoFromNow({ days: 8 }),
        allowMultipleAttempts: false,
        maxAttempts: 1,
        instructions: 'This exam opens tomorrow.',
        integrityPolicy: 'Standard activity logging applies.',
      },
      {
        id: 'ASN-505-STU-12',
        studentId: 'STU-12',
        examId: 'EX-505',
        opensAt: isoFromNow({ days: -10 }),
        dueAt: isoFromNow({ days: -1 }),
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
  }
}

const loadMockDb = () => {
  const storage = getStorage()

  if (!storage) {
    return createSeedMockDb()
  }

  try {
    const raw = storage.getItem(appConfig.api.mockDbStorageKey)
    const parsed = raw ? JSON.parse(raw) : null

    if (parsed?.version === DB_VERSION && parsed?.data?.users && parsed?.data?.exams) {
      return parsed.data
    }
  } catch {
    storage.removeItem(appConfig.api.mockDbStorageKey)
  }

  return createSeedMockDb()
}

export const mockDb = loadMockDb()

export const persistMockDb = () => {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(
    appConfig.api.mockDbStorageKey,
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
