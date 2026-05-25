import { QUESTION_TYPES } from './examModels'

export const TEACHER_EXAM_STATUSES = Object.freeze({
  draft: 'draft',
  published: 'published',
  archived: 'archived',
})

export const TEACHER_EXAM_STATUS_LABELS = Object.freeze({
  [TEACHER_EXAM_STATUSES.draft]: 'Draft',
  [TEACHER_EXAM_STATUSES.published]: 'Published',
  [TEACHER_EXAM_STATUSES.archived]: 'Archived',
})

export const TEACHER_SUBMISSION_STATUSES = Object.freeze({
  submitted: 'submitted',
  grading: 'grading',
  graded: 'graded',
  published: 'published',
})

export const TEACHER_SUBMISSION_STATUS_LABELS = Object.freeze({
  [TEACHER_SUBMISSION_STATUSES.submitted]: 'Submitted',
  [TEACHER_SUBMISSION_STATUSES.grading]: 'In Review',
  [TEACHER_SUBMISSION_STATUSES.graded]: 'Graded',
  [TEACHER_SUBMISSION_STATUSES.published]: 'Published',
})

export const TEACHER_EXAM_FILTERS = Object.freeze({
  all: 'all',
  draft: TEACHER_EXAM_STATUSES.draft,
  published: TEACHER_EXAM_STATUSES.published,
  archived: TEACHER_EXAM_STATUSES.archived,
})

export const TEACHER_QUESTION_TYPE_CONFIG = Object.freeze({
  [QUESTION_TYPES.singleChoice]: Object.freeze({
    answerMode: 'single',
    description: 'One correct option from a controlled list.',
    label: 'Single choice',
    supportsOptions: true,
  }),
  [QUESTION_TYPES.multipleChoice]: Object.freeze({
    answerMode: 'multiple',
    description: 'One or more correct options from a controlled list.',
    label: 'Multiple choice',
    supportsOptions: true,
  }),
  [QUESTION_TYPES.shortText]: Object.freeze({
    answerMode: 'text',
    description: 'Short free-text response reviewed manually or by keywords.',
    label: 'Short answer',
    supportsOptions: false,
  }),
  [QUESTION_TYPES.longText]: Object.freeze({
    answerMode: 'long-text',
    description: 'Long written response with rubric-style feedback.',
    label: 'Long answer',
    supportsOptions: false,
  }),
})

export const FUTURE_QUESTION_TYPES = Object.freeze([
  'file-upload',
  'code',
  'matching',
  'math',
  'interactive',
])

export const createEmptyTeacherQuestion = (type = QUESTION_TYPES.singleChoice) => {
  const baseQuestion = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attachments: [],
    explanation: '',
    points: 10,
    prompt: '',
    required: true,
    type,
  }

  if (TEACHER_QUESTION_TYPE_CONFIG[type]?.supportsOptions) {
    return {
      ...baseQuestion,
      correctAnswer: '',
      correctAnswers: [],
      options: [
        { id: 'A', label: '' },
        { id: 'B', label: '' },
        { id: 'C', label: '' },
        { id: 'D', label: '' },
      ],
    }
  }

  return {
    ...baseQuestion,
    acceptedKeywords: [],
    sampleAnswer: '',
  }
}

export const createEmptyTeacherExam = (teacherId) => ({
  id: '',
  archivedAt: null,
  availability: {
    dueAt: '',
    opensAt: '',
  },
  createdAt: '',
  description: '',
  durationMinutes: 60,
  instructions: '',
  maxAttempts: 1,
  ownerTeacherId: teacherId,
  passingGrade: 70,
  publishedAt: null,
  questions: [createEmptyTeacherQuestion()],
  status: TEACHER_EXAM_STATUSES.draft,
  title: '',
  updatedAt: '',
})

export const getTeacherExamMaxScore = (exam) =>
  (exam?.questions ?? []).reduce((total, question) => total + Number(question.points || 0), 0)

export const getSubmissionScore = (submission) =>
  (submission?.questionGrades ?? []).reduce(
    (total, grade) => total + Number(grade.score ?? grade.autoScore ?? 0),
    0,
  )

export const getSubmissionMaxScore = (submission) =>
  (submission?.questionGrades ?? []).reduce(
    (total, grade) => total + Number(grade.maxScore || 0),
    0,
  )

export const getSubmissionPercentage = (submission) => {
  const maxScore = getSubmissionMaxScore(submission)

  return maxScore > 0 ? Math.round((getSubmissionScore(submission) / maxScore) * 100) : 0
}
