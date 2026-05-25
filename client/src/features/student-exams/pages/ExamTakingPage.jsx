import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAttemptContext,
  recordAttemptActivity,
  saveAttemptDraft,
  startOrResumeExam,
  submitAttempt,
} from '../../../api/examService'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { LoadingState } from '../../../components/LoadingState'
import { appConfig } from '../../../config'
import { useBeforeUnload } from '../../../hooks/useBeforeUnload'
import { useCountdown } from '../../../hooks/useCountdown'
import {
  ATTEMPT_STATUSES,
  getMissingQuestionIds,
} from '../../../models/examModels'
import { buildResultsPath, useRouter } from '../../../routing/router'
import { useToast } from '../../../ui/ToastContext'
import { formatCountdown, formatDateTime } from '../../../utils/dateTime'
import { QuestionRenderer } from '../components/QuestionRenderer'

export function ExamTakingPage({ attemptId, examId }) {
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [answers, setAnswers] = useState({})
  const [attentionEvents, setAttentionEvents] = useState(0)
  const [context, setContext] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('saved')
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const answersRef = useRef(answers)
  const submittedRef = useRef(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const loadAttempt = useCallback(async () => {
    let isActive = true

    try {
      setLoading(true)
      setError('')
      const result = attemptId
        ? await getAttemptContext(attemptId)
        : await startOrResumeExam(examId)

      if (isActive) {
        setContext(result)
        setAnswers(result.attempt.answers ?? {})
        setDirty(false)
        setSaveState('saved')
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
  }, [attemptId, examId])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = attemptId
          ? await getAttemptContext(attemptId)
          : await startOrResumeExam(examId)

        if (isActive) {
          setContext(result)
          setAnswers(result.attempt.answers ?? {})
          setDirty(false)
          setSaveState('saved')
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
  }, [attemptId, examId])

  const attempt = context?.attempt
  const currentAttemptId = attempt?.id
  const currentExpiresAt = attempt?.expiresAt
  const isEditable = attempt?.status === ATTEMPT_STATUSES.inProgress

  const handleSave = useCallback(async () => {
    if (!currentAttemptId || !isEditable) {
      return
    }

    try {
      setSaveState('saving')
      const savedAttempt = await saveAttemptDraft(currentAttemptId, answersRef.current)
      setContext((current) =>
        current ? { ...current, attempt: savedAttempt } : current,
      )
      setDirty(false)
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      notify({ message: err.message, tone: 'danger', title: 'Autosave failed' })
    }
  }, [currentAttemptId, isEditable, notify])

  const submitCurrentAttempt = useCallback(
    async ({ auto = false } = {}) => {
      if (!currentAttemptId || !isEditable || submittedRef.current) {
        return
      }

      submittedRef.current = true
      setSubmitting(true)
      setSubmitError('')

      try {
        const result = await submitAttempt(currentAttemptId, {
          allowIncomplete: auto,
          answers: answersRef.current,
          submittedBy: auto ? 'timer' : 'student',
        })

        setDirty(false)
        notify({
          message: auto ? 'Timer expired. Your exam was submitted.' : 'Exam submitted.',
          tone: 'success',
        })
        navigate(buildResultsPath(result.attempt.id), { replace: true })
      } catch (err) {
        submittedRef.current = false
        setSubmitError(err.message)
        notify({ message: err.message, tone: 'danger', title: 'Submission failed' })
      } finally {
        setSubmitting(false)
        setShowSubmitDialog(false)
      }
    },
    [currentAttemptId, isEditable, navigate, notify],
  )

  const { remainingMs } = useCountdown(
    isEditable ? currentExpiresAt : null,
    () => submitCurrentAttempt({ auto: true }),
  )

  useBeforeUnload(dirty && isEditable)

  useEffect(() => {
    if (!dirty || !isEditable || !currentAttemptId) {
      return undefined
    }

    const timeoutId = window.setTimeout(handleSave, appConfig.exams.autoSaveDebounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentAttemptId, dirty, handleSave, isEditable])

  useEffect(() => {
    if (!isEditable || !currentAttemptId) {
      return undefined
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }

      setAttentionEvents((current) => current + 1)
      recordAttemptActivity(currentAttemptId, {
        message: 'Exam tab lost focus.',
        type: 'focus-lost',
      }).catch(() => {
        // Activity logging should never block the student from answering.
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentAttemptId, isEditable])

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }))
    setDirty(true)
    setSaveState('dirty')
    setSubmitError('')
  }

  const requestSubmit = useCallback(() => {
    if (!context) {
      return
    }

    const missingQuestionIds = getMissingQuestionIds(context.exam.questions, answers)

    if (missingQuestionIds.length > 0) {
      setSubmitError(
        `Please answer every question before submitting. Missing: ${missingQuestionIds.length}.`,
      )
      return
    }

    setShowSubmitDialog(true)
  }, [answers, context])

  useEffect(() => {
    if (!isEditable || !currentAttemptId) {
      return undefined
    }

    const handleKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        requestSubmit()
      }
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [currentAttemptId, handleSave, isEditable, requestSubmit])

  if (loading) {
    return <LoadingState label="Loading exam" rows={6} />
  }

  if (error && !context) {
    return (
      <section className="app-panel p-4">
        <h1 className="h4">Exam unavailable</h1>
        <p className="text-secondary">{error}</p>
        <button className="btn btn-outline-primary" onClick={loadAttempt} type="button">
          Retry
        </button>
      </section>
    )
  }

  if (!context) {
    return null
  }

  const answeredCount = context.exam.questions.filter((question) => {
    const value = answers[question.id]

    return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim()
  }).length
  const progressPercentage = Math.round(
    (answeredCount / Math.max(context.exam.questions.length, 1)) * 100,
  )

  if (!isEditable) {
    return (
      <section className="app-panel p-4">
        <h1 className="h4">Attempt already submitted</h1>
        <p className="text-secondary">
          This attempt is locked and cannot be edited.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate(buildResultsPath(context.attempt.id))}
          type="button"
        >
          View Results
        </button>
      </section>
    )
  }

  return (
    <section className="exam-taking-layout">
      <div className="exam-taking-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Attempt {context.attempt.attemptNumber}</p>
            <h1>{context.exam.title}</h1>
            <p className="text-secondary mb-0">
              Due {formatDateTime(context.assignment.dueAt)}
            </p>
          </div>
          <div className="timer-box" role="timer" aria-live="polite">
            <span>Time Remaining</span>
            <strong>{formatCountdown(remainingMs)}</strong>
          </div>
        </div>

        {submitError && (
          <div className="alert alert-danger" role="alert">
            {submitError}
          </div>
        )}

        {attentionEvents > 0 && (
          <div className="alert alert-warning" role="status">
            Focus change recorded {attentionEvents} time
            {attentionEvents === 1 ? '' : 's'} during this attempt.
          </div>
        )}

        <div className="question-list">
          {context.exam.questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-card-header">
                <span>Question {index + 1}</span>
                <strong>{question.points} pts</strong>
              </div>
              <QuestionRenderer
                disabled={submitting}
                onChange={(value) => handleAnswerChange(question.id, value)}
                question={question}
                value={answers[question.id]}
              />
            </article>
          ))}
        </div>
      </div>

      <aside className="exam-side-panel">
        <div className="app-panel p-3">
          <h2 className="h6 mb-3">Progress</h2>
          <div className="progress mb-2" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }} />
          </div>
          <p className="text-secondary small">
            {answeredCount} of {context.exam.questions.length} answered
          </p>
          <dl className="detail-list compact">
            <div>
              <dt>Autosave</dt>
              <dd>
                {saveState === 'saving'
                  ? 'Saving...'
                  : saveState === 'dirty'
                    ? 'Unsaved changes'
                    : saveState === 'error'
                      ? 'Retry needed'
                      : `Saved ${formatDateTime(context.attempt.autosavedAt)}`}
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatDateTime(context.attempt.startedAt)}</dd>
            </div>
          </dl>
          <div className="d-grid gap-2 mt-3">
            <button
              className="btn btn-outline-primary"
              disabled={saveState === 'saving' || submitting}
              onClick={handleSave}
              type="button"
            >
              Save Draft
            </button>
            <button
              className="btn btn-primary"
              disabled={submitting}
              onClick={requestSubmit}
              type="button"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        confirmLabel={submitting ? 'Submitting...' : 'Submit'}
        onCancel={() => setShowSubmitDialog(false)}
        onConfirm={() => submitCurrentAttempt()}
        open={showSubmitDialog}
        title="Submit exam?"
      >
        You will not be able to edit this attempt after submission.
      </ConfirmDialog>
    </section>
  )
}
