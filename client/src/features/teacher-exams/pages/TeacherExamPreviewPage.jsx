import { useEffect, useState } from 'react'
import { getTeacherExam } from '../../../api/teacherService'
import { LoadingState } from '../../../components/LoadingState'
import { buildTeacherExamEditorPath, useRouter } from '../../../routing/router'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { TeacherExamStatusBadge } from '../components/TeacherStatusBadge'

export function TeacherExamPreviewPage({ examId }) {
  const { navigate } = useRouter()
  const [error, setError] = useState('')
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadExam = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getTeacherExam(examId)

        if (isActive) {
          setExam(result)
        }
      } catch (err) {
        if (isActive) {
          setError(err.message)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadExam()

    return () => {
      isActive = false
    }
  }, [examId])

  if (loading) {
    return <LoadingState label="Loading exam preview" rows={5} />
  }

  if (error) {
    return (
      <section className="app-panel p-4">
        <h1 className="h4">Preview unavailable</h1>
        <p className="text-secondary mb-0">{error}</p>
      </section>
    )
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Student Simulation</p>
          <h1>{exam.title}</h1>
          <p className="text-secondary mb-0">
            Simulated student view before publishing.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <TeacherExamStatusBadge status={exam.status} />
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(buildTeacherExamEditorPath(exam.id))}
            type="button"
          >
            Back to Editor
          </button>
        </div>
      </div>

      <section className="app-panel p-3 p-md-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <div>
            <h2 className="h4 mb-2">{exam.title}</h2>
            <p className="text-secondary mb-0">{exam.description}</p>
          </div>
          <div className="score-chip">
            <span>Duration</span>
            <strong>{formatDuration(exam.durationMinutes)}</strong>
          </div>
        </div>

        <div className="instruction-grid mb-4">
          <div className="nested-panel">
            <h3 className="h6">Instructions</h3>
            <p className="mb-0">{exam.instructions}</p>
          </div>
          <div className="nested-panel">
            <dl className="detail-list">
              <div>
                <dt>Opens</dt>
                <dd>{formatDateTime(exam.availability.opensAt)}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{formatDateTime(exam.availability.dueAt)}</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{exam.maxAttempts}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="question-list">
          {exam.questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-card-header">
                <div>
                  <span>Question {index + 1}</span>
                  <h3 className="h6 mb-0">{question.prompt}</h3>
                </div>
                <strong>{question.points} pts</strong>
              </div>
              {(question.options ?? []).length > 0 ? (
                <div className="choice-stack">
                  {question.options.map((option) => (
                    <label className="choice-option" key={option.id}>
                      <input disabled type="radio" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="form-control answer-textarea"
                  disabled
                  placeholder="Student answer"
                  rows={question.type === 'long-text' ? 6 : 2}
                />
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
