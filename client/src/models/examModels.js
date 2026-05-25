export const QUESTION_TYPES = Object.freeze({
  singleChoice: 'single-choice',
  multipleChoice: 'multiple-choice',
  shortText: 'short-text',
  longText: 'long-text',
})

export const EXAM_STATUSES = Object.freeze({
  notStarted: 'not-started',
  inProgress: 'in-progress',
  submitted: 'submitted',
  graded: 'graded',
  expired: 'expired',
})

export const ATTEMPT_STATUSES = Object.freeze({
  inProgress: 'in-progress',
  submitted: 'submitted',
  graded: 'graded',
  expired: 'expired',
})

export const EXAM_STATUS_LABELS = Object.freeze({
  [EXAM_STATUSES.notStarted]: 'Not Started',
  [EXAM_STATUSES.inProgress]: 'In Progress',
  [EXAM_STATUSES.submitted]: 'Submitted',
  [EXAM_STATUSES.graded]: 'Graded',
  [EXAM_STATUSES.expired]: 'Expired',
})

export const DASHBOARD_FILTERS = Object.freeze({
  all: 'all',
  available: 'available',
  upcoming: 'upcoming',
  completed: 'completed',
})

export const STATUS_FILTER_OPTIONS = Object.freeze([
  { label: 'All statuses', value: 'all' },
  { label: EXAM_STATUS_LABELS[EXAM_STATUSES.notStarted], value: EXAM_STATUSES.notStarted },
  { label: EXAM_STATUS_LABELS[EXAM_STATUSES.inProgress], value: EXAM_STATUSES.inProgress },
  { label: EXAM_STATUS_LABELS[EXAM_STATUSES.submitted], value: EXAM_STATUSES.submitted },
  { label: EXAM_STATUS_LABELS[EXAM_STATUSES.graded], value: EXAM_STATUSES.graded },
  { label: EXAM_STATUS_LABELS[EXAM_STATUSES.expired], value: EXAM_STATUSES.expired },
])

/**
 * @typedef {Object} ExamQuestion
 * @property {string} id
 * @property {string} type
 * @property {string} prompt
 * @property {number} points
 * @property {{ id: string, label: string }[]=} options
 * @property {string=} correctAnswer
 * @property {string[]=} correctAnswers
 * @property {string[]=} acceptedKeywords
 * @property {string=} sampleAnswer
 */

/**
 * @typedef {Object} ExamAttempt
 * @property {string} id
 * @property {string} examId
 * @property {string} studentId
 * @property {string} status
 * @property {Record<string, string|string[]>} answers
 * @property {string} startedAt
 * @property {string=} autosavedAt
 * @property {string=} submittedAt
 * @property {string} expiresAt
 * @property {number=} score
 * @property {number=} maxScore
 */

export const getQuestionMaxScore = (question) => Number(question.points || 0)

export const calculateMaxScore = (questions = []) =>
  questions.reduce((total, question) => total + getQuestionMaxScore(question), 0)

export const isChoiceQuestion = (question) =>
  [QUESTION_TYPES.singleChoice, QUESTION_TYPES.multipleChoice, 'multiple-choice'].includes(
    question.type,
  )

export const normalizeOptions = (question) =>
  (question.options ?? []).map((option) =>
    typeof option === 'string' ? { id: option, label: option } : option,
  )

export const normalizeAnswerForQuestion = (question, answer) => {
  if (question.type === QUESTION_TYPES.multipleChoice) {
    return Array.isArray(answer) ? answer : []
  }

  return typeof answer === 'string' ? answer : ''
}

export const isAnswerComplete = (question, answer) => {
  const value = normalizeAnswerForQuestion(question, answer)

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value.trim().length > 0
}

const compareChoiceSets = (answer = [], correct = []) => {
  const answerSet = new Set(answer)
  const correctSet = new Set(correct)

  return (
    answerSet.size === correctSet.size &&
    [...answerSet].every((value) => correctSet.has(value))
  )
}

const gradeTextAnswer = (question, answer) => {
  const value = String(answer ?? '').trim().toLowerCase()

  if (!value) {
    return {
      feedback: 'No answer submitted.',
      isCorrect: false,
      score: 0,
    }
  }

  const keywords = question.acceptedKeywords ?? []

  if (keywords.length === 0) {
    return {
      feedback:
        'Mock teacher review: the answer is complete and ready for teacher review.',
      isCorrect: true,
      score: Math.round(getQuestionMaxScore(question) * 0.8),
    }
  }

  const matchedKeywords = keywords.filter((keyword) =>
    value.includes(String(keyword).toLowerCase()),
  )
  const ratio = matchedKeywords.length / keywords.length

  return {
    feedback:
      ratio >= 0.75
        ? 'Strong answer with the expected concepts.'
        : 'Partially correct; review the core concepts for this question.',
    isCorrect: ratio >= 0.75,
    score: Math.round(getQuestionMaxScore(question) * Math.max(0.35, ratio)),
  }
}

export const gradeQuestionAnswer = (question, answer) => {
  const maxScore = getQuestionMaxScore(question)
  const value = normalizeAnswerForQuestion(question, answer)

  if (question.type === QUESTION_TYPES.multipleChoice) {
    const correct = question.correctAnswers ?? []
    const isCorrect = compareChoiceSets(value, correct)

    return {
      feedback: isCorrect
        ? 'Correct selection.'
        : 'Selection does not match the expected answer set.',
      isCorrect,
      maxScore,
      score: isCorrect ? maxScore : 0,
    }
  }

  if (
    question.type === QUESTION_TYPES.singleChoice ||
    question.type === 'multiple-choice'
  ) {
    const isCorrect = String(value) === String(question.correctAnswer ?? '')

    return {
      feedback: isCorrect ? 'Correct answer.' : 'Review this concept.',
      isCorrect,
      maxScore,
      score: isCorrect ? maxScore : 0,
    }
  }

  const textGrade = gradeTextAnswer(question, value)

  return {
    ...textGrade,
    maxScore,
  }
}

export const getMissingQuestionIds = (questions, answers) =>
  questions
    .filter((question) => !isAnswerComplete(question, answers?.[question.id]))
    .map((question) => question.id)
