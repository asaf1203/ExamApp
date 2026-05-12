/**
 * Async facade over in-memory mock data. Mimics network latency and returns clones
 * so callers cannot accidentally mutate the shared mockDb singleton.
 */
import { mockDb } from './mockDb'

/** Artificial delay (ms) so UI loading states behave like a real HTTP round-trip */
const NETWORK_DELAY_MS = 450

const clone = (value) => structuredClone(value)

/** Wraps synchronous reads/writes in a delayed Promise with error handling */
const simulateRequest = (handler) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(clone(handler()))
      } catch (error) {
        reject(error)
      }
    }, NETWORK_DELAY_MS)
  })

/** Normalizes user-typed exam IDs for case-insensitive matching */
const normalizeId = (id) => String(id).trim().toUpperCase()

export const getAllExams = async () =>
  simulateRequest(() => mockDb.exams)

export const getExamById = async (id) =>
  simulateRequest(() => {
    const exam = mockDb.exams.find((item) => item.id === normalizeId(id))

    if (!exam) {
      throw new Error(`Exam "${id}" was not found.`)
    }

    return exam
  })

/** Typo alias kept for backward compatibility with any existing imports */
export const getExamByld = getExamById

export const createExam = async (exam) =>
  simulateRequest(() => {
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

export const getStudentScores = async () =>
  simulateRequest(() => mockDb.studentScores)

export const getScoresByExamId = async (examId) =>
  simulateRequest(() =>
    mockDb.studentScores.filter((score) => score.examId === normalizeId(examId)),
  )
