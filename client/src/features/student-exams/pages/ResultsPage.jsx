import { useCallback, useEffect, useState } from 'react'
import { getAttemptResult } from '../../../api/examService'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import { StatusBadge } from '../../../components/StatusBadge'
import { ATTEMPT_STATUSES } from '../../../models/examModels'
import { ROUTES, buildResultsPath, useRouter } from '../../../routing/router'
import { formatDateTime } from '../../../utils/dateTime'

const formatAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return answer.length > 0 ? answer.join(', ') : '-'
  }

  return String(answer ?? '').trim() || '-'
}

const formatCorrectAnswer = (question) => {
  if (question.correctAnswers) {
    return question.correctAnswers.join(', ')
  }

  return question.correctAnswer || question.sampleAnswer || 'Teacher reviewed'
}

function ResultSummary({ attempt }) {
  const percentage =
    attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0

  return (
    <div className="summary-grid">
      <article className="summary-card">
        <span>Score</span>
        <strong>{percentage}%</strong>
        <small>
          {attempt.score} / {attempt.maxScore} points
        </small>
      </article>
      <article className="summary-card">
        <span>Status</span>
        <strong className="summary-status">
          <StatusBadge status={attempt.status} />
        </strong>
      </article>
      <article className="summary-card">
        <span>Submitted</span>
        <strong>{formatDateTime(attempt.submittedAt)}</strong>
        <small>{attempt.submittedBy === 'timer' ? 'Auto-submitted' : 'Student'}</small>
      </article>
      <article className="summary-card">
        <span>Attempt</span>
        <strong>{attempt.attemptNumber}</strong>
        <small>History saved</small>
      </article>
    </div>
  )
}

export function ResultsPage({ attemptId }) {
  const { navigate } = useRouter()
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadResult = useCallback(async () => {
    let isActive = true

    try {
      setLoading(true)
      setError('')
      const result = await getAttemptResult(attemptId)

      if (isActive) {
        setContext(result)
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

    return () => {
      isActive = false
    }
  }, [attemptId])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getAttemptResult(attemptId)

        if (isActive) {
          setContext(result)
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

    run()

    return () => {
      isActive = false
    }
  }, [attemptId])

  if (loading) {
    return <LoadingState label="Loading result" rows={5} />
  }

  if (error && !context) {
    return (
      <section className="app-panel p-4">
        <EmptyState
          action={
            <button className="btn btn-outline-primary" onClick={loadResult} type="button">
              Retry
            </button>
          }
          description={error}
          title="Result unavailable"
        />
      </section>
    )
  }

  if (!context) {
    return null
  }

  const { attempt, exam, history } = context
  const percentage =
    attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Grades and Feedback</p>
          <h1>{exam.title}</h1>
          <p className="text-secondary mb-0">
            Submitted {formatDateTime(attempt.submittedAt)}
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(ROUTES.studentDashboard)}
          type="button"
        >
          Dashboard
        </button>
      </div>

      <ResultSummary attempt={attempt} />

      <section className="app-panel p-3 p-md-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h5 mb-1">Score Breakdown</h2>
            <p className="text-secondary mb-0">{attempt.teacherFeedback}</p>
          </div>
          <div className="score-chip align-self-md-start">
            <span>Final</span>
            <strong>{percentage}%</strong>
          </div>
        </div>
        <div className="result-question-list">
          {exam.questions.map((question, index) => {
            const feedback = attempt.scoreBreakdown.find(
              (item) => item.questionId === question.id,
            )

            return (
              <article className="result-question" key={question.id}>
                <div className="result-question-header">
                  <div>
                    <span>Question {index + 1}</span>
                    <h3 className="h6 mb-0">{question.prompt}</h3>
                  </div>
                  <strong>
                    {feedback?.score ?? 0} / {question.points}
                  </strong>
                </div>
                <dl className="result-answer-grid">
                  <div>
                    <dt>Your answer</dt>
                    <dd>{formatAnswer(attempt.answers?.[question.id])}</dd>
                  </div>
                  <div>
                    <dt>Expected answer</dt>
                    <dd>{formatCorrectAnswer(question)}</dd>
                  </div>
                  <div>
                    <dt>Feedback</dt>
                    <dd>{feedback?.feedback ?? 'No feedback provided.'}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <section className="app-panel p-3 p-md-4">
        <h2 className="h5 mb-3">Past Attempts</h2>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Attempt</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.attemptNumber}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDateTime(item.submittedAt)}</td>
                  <td>
                    {item.status === ATTEMPT_STATUSES.inProgress || item.score == null
                      ? '-'
                      : `${item.score} / ${item.maxScore}`}
                  </td>
                  <td className="text-end">
                    {item.status !== ATTEMPT_STATUSES.inProgress && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        disabled={item.id === attempt.id}
                        onClick={() => navigate(buildResultsPath(item.id))}
                        type="button"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
