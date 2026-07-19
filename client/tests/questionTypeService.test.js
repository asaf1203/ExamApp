import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOCK_API_DELAY_MS } from '../src/api/mockApiClient'
import {
  listTeacherQuestionTypes,
  resetTeacherQuestionTypes,
  saveTeacherQuestionTypes,
} from '../src/api/questionTypeService'
import { QUESTION_TYPES } from '../src/models/examModels'

const resolveMockRequest = async (request) => {
  await vi.advanceTimersByTimeAsync(MOCK_API_DELAY_MS)
  return request
}

describe('questionTypeService', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await resolveMockRequest(resetTeacherQuestionTypes())
  })

  afterEach(async () => {
    await resolveMockRequest(resetTeacherQuestionTypes())
    vi.useRealTimers()
  })

  it('lists supported teacher question types with enabled defaults', async () => {
    const questionTypes = await resolveMockRequest(listTeacherQuestionTypes())

    expect(questionTypes.map((questionType) => questionType.type)).toEqual([
      QUESTION_TYPES.singleChoice,
      QUESTION_TYPES.multipleChoice,
      QUESTION_TYPES.shortText,
      QUESTION_TYPES.longText,
    ])
    expect(questionTypes.every((questionType) => questionType.enabled)).toBe(true)
    expect(questionTypes.every((questionType) => questionType.defaultPoints === 10)).toBe(true)
  })

  it('persists lecturer-managed availability and default points', async () => {
    const defaults = await resolveMockRequest(listTeacherQuestionTypes())
    const nextSettings = defaults.map((questionType) =>
      questionType.type === QUESTION_TYPES.longText
        ? { ...questionType, defaultPoints: 25, enabled: false }
        : questionType,
    )

    await resolveMockRequest(saveTeacherQuestionTypes(nextSettings))
    const savedSettings = await resolveMockRequest(listTeacherQuestionTypes())

    expect(savedSettings.find((questionType) => questionType.type === QUESTION_TYPES.longText))
      .toMatchObject({
        defaultPoints: 25,
        enabled: false,
      })
  })

  it('prevents disabling every supported question type', async () => {
    const defaults = await resolveMockRequest(listTeacherQuestionTypes())
    const request = saveTeacherQuestionTypes(
      defaults.map((questionType) => ({ ...questionType, enabled: false })),
    )
    const assertion = expect(request).rejects.toThrow(
      'At least one question type must stay enabled.',
    )

    await vi.advanceTimersByTimeAsync(MOCK_API_DELAY_MS)

    await assertion
  })

  it('can reset question type settings to defaults', async () => {
    const defaults = await resolveMockRequest(listTeacherQuestionTypes())
    await resolveMockRequest(
      saveTeacherQuestionTypes(
        defaults.map((questionType) =>
          questionType.type === QUESTION_TYPES.shortText
            ? { ...questionType, defaultPoints: 5, enabled: false }
            : questionType,
        ),
      ),
    )

    const reset = await resolveMockRequest(resetTeacherQuestionTypes())

    expect(reset.every((questionType) => questionType.enabled)).toBe(true)
    expect(reset.every((questionType) => questionType.defaultPoints === 10)).toBe(true)
  })
})
