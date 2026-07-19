import { describe, expect, it } from 'vitest'
import { matchRoute } from '../src/routing/router'

describe('routing', () => {
  it('matches the teacher question type management route', () => {
    expect(matchRoute('/teacher/question-types')).toMatchObject({
      name: 'teacherQuestionTypes',
      params: {},
      path: '/teacher/question-types',
    })
  })
})
