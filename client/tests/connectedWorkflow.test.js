import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthToken } from '../src/api/authTokenStorage'
import { login, logout } from '../src/api/authService'
import { MOCK_API_DELAY_MS } from '../src/api/mockApiClient'
import { resetMockDb } from '../src/api/mockDb'
import {
  getAttemptResult,
  listStudentExams,
  startOrResumeExam,
  submitAttempt,
} from '../src/api/examService'
import {
  createTeacherExam,
  getTeacherSubmission,
  listTeacherSubmissions,
  publishTeacherExam,
  publishTeacherSubmissionGrades,
  saveTeacherExam,
} from '../src/api/teacherService'
import { QUESTION_TYPES } from '../src/models/examModels'

const resolveMockRequest = async (request) => {
  await vi.advanceTimersByTimeAsync(MOCK_API_DELAY_MS)
  return request
}

const signIn = async (email, password) =>
  resolveMockRequest(login({ email, password }))

describe('connected exam workflow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetMockDb()
    clearAuthToken()
  })

  afterEach(() => {
    clearAuthToken()
    vi.useRealTimers()
  })

  it('connects teacher publishing, student submission, teacher grading, and student results', async () => {
    await signIn('teacher@example.com', 'teacher123')

    const draft = await resolveMockRequest(
      createTeacherExam({ title: 'Shared Workflow Exam' }),
    )
    const now = Date.now()
    const savedExam = await resolveMockRequest(
      saveTeacherExam(draft.id, {
        availability: {
          dueAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
          opensAt: new Date(now - 60 * 1000).toISOString(),
        },
        description: 'Integration workflow coverage.',
        durationMinutes: 30,
        instructions: 'Complete the connected workflow exam.',
        maxAttempts: 1,
        passingGrade: 60,
        questions: [
          {
            id: 'Q-CONNECTED-1',
            correctAnswer: 'Shared mockDB',
            options: [
              { id: 'Shared mockDB', label: 'Shared mockDB' },
              { id: 'Isolated fixture', label: 'Isolated fixture' },
            ],
            points: 10,
            prompt: 'Which data source connects teacher and student flows?',
            required: true,
            type: QUESTION_TYPES.singleChoice,
          },
        ],
        status: 'draft',
        title: 'Shared Workflow Exam',
      }),
    )

    await resolveMockRequest(publishTeacherExam(savedExam.id))
    await resolveMockRequest(logout())

    await signIn('student@example.com', 'student123')
    const studentDashboard = await resolveMockRequest(
      listStudentExams({ search: 'Shared Workflow Exam' }),
    )

    expect(studentDashboard.items).toHaveLength(1)
    expect(studentDashboard.items[0]).toMatchObject({
      status: 'not-started',
      title: 'Shared Workflow Exam',
    })

    const started = await resolveMockRequest(startOrResumeExam(savedExam.id))
    const submitted = await resolveMockRequest(
      submitAttempt(started.attempt.id, {
        answers: { 'Q-CONNECTED-1': 'Shared mockDB' },
      }),
    )

    expect(submitted.attempt).toMatchObject({
      resultsVisible: false,
      status: 'submitted',
    })
    await resolveMockRequest(logout())

    await signIn('teacher@example.com', 'teacher123')
    const submissions = await resolveMockRequest(
      listTeacherSubmissions({ search: 'Shared Workflow Exam' }),
    )

    expect(submissions.items).toHaveLength(1)
    expect(submissions.items[0]).toMatchObject({
      examTitle: 'Shared Workflow Exam',
      status: 'submitted',
      studentName: 'Maya Rosen',
    })

    const review = await resolveMockRequest(getTeacherSubmission(started.attempt.id))
    await resolveMockRequest(
      publishTeacherSubmissionGrades(started.attempt.id, {
        overallFeedback: 'Connected workflow verified.',
        questionGrades: review.submission.questionGrades,
      }),
    )
    await resolveMockRequest(logout())

    await signIn('student@example.com', 'student123')
    const result = await resolveMockRequest(getAttemptResult(started.attempt.id))

    expect(result.attempt).toMatchObject({
      resultsVisible: true,
      score: 10,
      status: 'graded',
      teacherFeedback: 'Connected workflow verified.',
    })
  })
})
