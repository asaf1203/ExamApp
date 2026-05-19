/**
 * Async facade over in-memory mock data. Mimics network latency and returns clones
 * so callers cannot accidentally mutate the shared mockDb singleton.
 */
import { apiClient, mockRequest } from './apiClient'
import { mockDb } from './mockDb'

/** Normalizes user-typed exam IDs for case-insensitive matching */
const normalizeId = (id) => String(id).trim().toUpperCase()

export const getAllExams = async () =>
  apiClient.isMock ? mockRequest(() => mockDb.exams) : apiClient.get('/exams')

export const getExamById = async (id) =>
  apiClient.isMock
    ? mockRequest(() => {
        const exam = mockDb.exams.find((item) => item.id === normalizeId(id))

        if (!exam) {
          throw new Error(`Exam "${id}" was not found.`)
        }

        return exam
      })
    : apiClient.get(`/exams/${normalizeId(id)}`)

/** Typo alias kept for backward compatibility with any existing imports */
export const getExamByld = getExamById

export const createExam = async (exam) =>
  apiClient.isMock
    ? mockRequest(() => {
        const nextExam = {
          id: exam.id ? normalizeId(exam.id) : `EX-${Date.now()}`,
          title: exam.title,
          description: exam.description ?? '',
          durationMinutes: Number(exam.durationMinutes ?? 60),
          createdBy: exam.createdBy ?? 'Teacher',
          questions: exam.questions ?? [],
        }

        mockDb.exams.push(nextExam)
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
