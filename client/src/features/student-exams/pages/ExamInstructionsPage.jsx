import { useCallback, useEffect, useState } from 'react'
import {
  getStudentExamDetails,
  startOrResumeExam,
} from '../../../api/examService'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingState } from '../../../components/LoadingState'
import { StatusBadge } from '../../../components/StatusBadge'
import { ATTEMPT_STATUSES, EXAM_STATUSES } from '../../../models/examModels'
import {
  buildExamTakingPath,
  buildResultsPath,
  useRouter,
} from '../../../routing/router'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { useToast } from '../../../ui/ToastContext'

export function ExamInstructionsPage({ examId }) {
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const loadDetails = useCallback(async () => {
    let isActive = true

    try {
      setLoading(true)
      setError('')
      const result = await getStudentExamDetails(examId)

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
  }, [examId])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getStudentExamDetails(examId)

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
  }, [examId])

  const handleStart = async () => {
    try {
      setStarting(true)
      setError('')
      const result = await startOrResumeExam(examId)

      notify({
        message: result.resumed ? 'Draft loaded.' : 'Exam started.',
        tone: 'success',
      })
      navigate(buildExamTakingPath(result.exam.id, result.attempt.id))
    } catch (err) {
      setError(err.message)
      notify({ message: err.message, tone: 'danger', title: 'Could not enter exam' })
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <section className="page-stack">
        <LoadingState label="Loading exam instructions" rows={5} />
      </section>
    )
  }

  if (error && !context) {
    return (
      <section className="app-panel p-4">
        <EmptyState
          action={
            <button className="btn btn-outline-primary" onClick={loadDetails} type="button">
              Retry
            </button>
          }
          description={error}
          title="Exam details unavailable"
        />
      </section>
    )
  }

  const { assignment, attempts, card, exam } = context
  const latestAttempt = attempts[0]
  const canEnter = card.canStart || card.canContinue

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Exam Instructions</p>
          <h1>{exam.title}</h1>
          <p className="text-secondary mb-0">{exam.description}</p>
        </div>
        <StatusBadge status={card.status} />
      </div>

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      <section className="instruction-grid">
        <article className="app-panel p-3 p-md-4">
          <h2 className="h5 mb-3">Details</h2>
          <dl className="detail-list">
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(exam.durationMinutes)}</dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>{exam.questions.length}</dd>
            </div>
            <div>
              <dt>Opens</dt>
              <dd>{formatDateTime(assignment.opensAt)}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{formatDateTime(assignment.dueAt)}</dd>
            </div>
            <div>
              <dt>Attempts</dt>
              <dd>
                {attempts.length} / {assignment.maxAttempts}
              </dd>
            </div>
          </dl>
        </article>

        <article className="app-panel p-3 p-md-4">
          <h2 className="h5 mb-3">Instructions</h2>
          <p>{assignment.instructions}</p>
          <div className="integrity-box">
            <strong>Integrity policy</strong>
            <span>{assignment.integrityPolicy}</span>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-4">
            <button
              className="btn btn-primary"
              disabled={!canEnter || starting}
              onClick={handleStart}
              type="button"
            >
              {starting
                ? 'Preparing...'
                : card.canContinue
                  ? 'Continue Exam'
                  : card.status === EXAM_STATUSES.graded
                    ? 'Start New Attempt'
                    : 'Start Exam'}
            </button>
            {latestAttempt?.status === ATTEMPT_STATUSES.graded && (
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate(buildResultsPath(latestAttempt.id))}
                type="button"
              >
                View Latest Results
              </button>
            )}
          </div>
          {!canEnter && (
            <p className="text-secondary small mt-3 mb-0">
              This exam cannot be started right now.
            </p>
          )}
        </article>
      </section>

      <section className="app-panel p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Question Overview</h2>
          <span className="text-secondary small">{exam.subject}</span>
        </div>
        <ol className="question-overview">
          {exam.questions.map((question) => (
            <li key={question.id}>
              <span>{question.prompt}</span>
              <strong>{question.points} pts</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="app-panel p-3 p-md-4">
        <h2 className="h5 mb-3">Attempt History</h2>
        {attempts.length === 0 ? (
          <p className="text-secondary mb-0">No attempts yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.attemptNumber}</td>
                    <td>
                      <StatusBadge status={attempt.status} />
                    </td>
                    <td>{formatDateTime(attempt.startedAt)}</td>
                    <td>{formatDateTime(attempt.submittedAt)}</td>
                    <td>
                      {attempt.score == null
                        ? '-'
                        : `${attempt.score} / ${attempt.maxScore}`}
                    </td>
                    <td className="text-end">
                      {attempt.status === ATTEMPT_STATUSES.graded && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(buildResultsPath(attempt.id))}
                          type="button"
                        >
                          Results
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
