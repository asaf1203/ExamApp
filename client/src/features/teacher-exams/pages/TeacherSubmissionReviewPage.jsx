import { useCallback, useEffect, useState } from 'react'
import {
  getTeacherSubmission,
  hideTeacherSubmissionGrades,
  markTeacherSubmissionGraded,
  publishTeacherSubmissionGrades,
  saveTeacherSubmissionGrades,
} from '../../../api/teacherService'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { LoadingState } from '../../../components/LoadingState'
import {
  TEACHER_SUBMISSION_STATUSES,
  getSubmissionMaxScore,
  getSubmissionPercentage,
  getSubmissionScore,
} from '../../../models/teacherModels'
import { ROUTES, buildTeacherSubmissionPath, useRouter } from '../../../routing/router'
import { useToast } from '../../../ui/ToastContext'
import { formatDateTime, formatDuration } from '../../../utils/dateTime'
import { TeacherSubmissionStatusBadge } from '../components/TeacherStatusBadge'

const formatAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return answer.join(', ') || '-'
  }

  return String(answer ?? '').trim() || '-'
}

export function TeacherSubmissionReviewPage({ submissionId }) {
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [confirmAction, setConfirmAction] = useState(null)
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [overallFeedback, setOverallFeedback] = useState('')
  const [questionGrades, setQuestionGrades] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadSubmission = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getTeacherSubmission(submissionId)

        if (isActive) {
          setContext(result)
          setQuestionGrades(result.submission.questionGrades ?? [])
          setOverallFeedback(result.submission.overallFeedback ?? '')
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

    loadSubmission()

    return () => {
      isActive = false
    }
  }, [submissionId])

  const draftSubmission = context?.submission
    ? {
        ...context.submission,
        overallFeedback,
        questionGrades,
      }
    : null

  const score = draftSubmission ? getSubmissionScore(draftSubmission) : 0
  const maxScore = draftSubmission ? getSubmissionMaxScore(draftSubmission) : 0
  const percentage = draftSubmission ? getSubmissionPercentage(draftSubmission) : 0

  const updateQuestionGrade = (questionId, patch) => {
    setQuestionGrades((current) =>
      current.map((grade) =>
        grade.questionId === questionId
          ? {
              ...grade,
              ...patch,
              overridden: patch.score !== undefined ? true : grade.overridden,
            }
          : grade,
      ),
    )
  }

  const saveDraft = useCallback(async () => {
    try {
      setSaving(true)
      await saveTeacherSubmissionGrades(submissionId, {
        overallFeedback,
        questionGrades,
      })
      notify({ message: 'Grading draft saved.', tone: 'success' })
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Save failed' })
    } finally {
      setSaving(false)
    }
  }, [notify, overallFeedback, questionGrades, submissionId])

  const runConfirmedAction = async () => {
    try {
      setSaving(true)

      if (confirmAction === 'complete') {
        await markTeacherSubmissionGraded(submissionId, {
          overallFeedback,
          questionGrades,
        })
        notify({ message: 'Grading marked complete.', tone: 'success' })
      }

      if (confirmAction === 'publish') {
        await publishTeacherSubmissionGrades(submissionId, {
          overallFeedback,
          questionGrades,
        })
        notify({ message: 'Grades published.', tone: 'success' })
      }

      if (confirmAction === 'hide') {
        await hideTeacherSubmissionGrades(submissionId, {
          overallFeedback,
          questionGrades,
        })
        notify({ message: 'Results hidden.', tone: 'success' })
      }

      const result = await getTeacherSubmission(submissionId)
      setContext(result)
      setQuestionGrades(result.submission.questionGrades ?? [])
      setOverallFeedback(result.submission.overallFeedback ?? '')
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Action failed' })
    } finally {
      setConfirmAction(null)
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState label="Loading submission" rows={6} />
  }

  if (error) {
    return (
      <section className="app-panel p-4">
        <h1 className="h4">Submission unavailable</h1>
        <p className="text-secondary">{error}</p>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(ROUTES.teacherSubmissions)}
          type="button"
        >
          Back to Submissions
        </button>
      </section>
    )
  }

  const { exam, nextSubmissionId, previousSubmissionId, submission } = context

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Manual Grading</p>
          <h1>{submission.studentName}</h1>
          <p className="text-secondary mb-0">
            {exam.title} · submitted {formatDateTime(submission.submittedAt)}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <TeacherSubmissionStatusBadge status={submission.status} />
          <button
            className="btn btn-outline-primary"
            disabled={!previousSubmissionId}
            onClick={() => navigate(buildTeacherSubmissionPath(previousSubmissionId))}
            type="button"
          >
            Previous
          </button>
          <button
            className="btn btn-outline-primary"
            disabled={!nextSubmissionId}
            onClick={() => navigate(buildTeacherSubmissionPath(nextSubmissionId))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span>Score</span>
          <strong>{percentage}%</strong>
          <small>
            {score} / {maxScore} points
          </small>
        </article>
        <article className="summary-card">
          <span>Duration</span>
          <strong>{formatDuration(submission.durationMinutes)}</strong>
          <small>Completed attempt</small>
        </article>
        <article className="summary-card">
          <span>Results</span>
          <strong>{submission.resultsVisible ? 'Visible' : 'Hidden'}</strong>
          <small>Student visibility</small>
        </article>
        <article className="summary-card">
          <span>Started</span>
          <strong>{formatDateTime(submission.startedAt)}</strong>
        </article>
      </div>

      <section className="grading-layout">
        <div className="grading-main">
          {exam.questions.map((question, index) => {
            const grade = questionGrades.find((item) => item.questionId === question.id)

            return (
              <article className="question-card" key={question.id}>
                <div className="question-card-header">
                  <div>
                    <span>Question {index + 1}</span>
                    <h2 className="h6 mb-0">{question.prompt}</h2>
                  </div>
                  <strong>{question.points} pts</strong>
                </div>
                <dl className="result-answer-grid">
                  <div>
                    <dt>Student answer</dt>
                    <dd>{formatAnswer(submission.answers?.[question.id])}</dd>
                  </div>
                  <div>
                    <dt>Auto feedback</dt>
                    <dd>{grade?.feedback ?? 'No automatic feedback.'}</dd>
                  </div>
                </dl>

                <div className="builder-form-grid mt-3">
                  <div className="form-field">
                    <label className="form-label" htmlFor={`${question.id}-score`}>
                      Score
                    </label>
                    <input
                      className="form-control"
                      id={`${question.id}-score`}
                      max={grade?.maxScore ?? question.points}
                      min="0"
                      onChange={(event) =>
                        updateQuestionGrade(question.id, {
                          score: Number(event.target.value),
                        })
                      }
                      type="number"
                      value={grade?.score ?? 0}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor={`${question.id}-max`}>
                      Max
                    </label>
                    <input
                      className="form-control"
                      disabled
                      id={`${question.id}-max`}
                      type="number"
                      value={grade?.maxScore ?? question.points}
                    />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label" htmlFor={`${question.id}-feedback`}>
                      Feedback
                    </label>
                    <textarea
                      className="form-control"
                      id={`${question.id}-feedback`}
                      onChange={(event) =>
                        updateQuestionGrade(question.id, {
                          feedback: event.target.value,
                        })
                      }
                      rows={3}
                      value={grade?.feedback ?? ''}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <aside className="exam-side-panel">
          <section className="app-panel p-3">
            <h2 className="h6 mb-3">Grade Summary</h2>
            <div className="score-chip mb-3">
              <span>Current score</span>
              <strong>{percentage}%</strong>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="overallFeedback">
                Overall feedback
              </label>
              <textarea
                className="form-control"
                id="overallFeedback"
                onChange={(event) => setOverallFeedback(event.target.value)}
                rows={5}
                value={overallFeedback}
              />
            </div>
            <div className="d-grid gap-2 mt-3">
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                onClick={saveDraft}
                type="button"
              >
                Save Draft
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                onClick={() => setConfirmAction('complete')}
                type="button"
              >
                Mark Complete
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  saving || submission.status === TEACHER_SUBMISSION_STATUSES.published
                }
                onClick={() => setConfirmAction('publish')}
                type="button"
              >
                Publish Results
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={
                  saving || submission.status !== TEACHER_SUBMISSION_STATUSES.published
                }
                onClick={() => setConfirmAction('hide')}
                type="button"
              >
                Hide Results
              </button>
            </div>
          </section>
        </aside>
      </section>

      <ConfirmDialog
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        open={Boolean(confirmAction)}
        title="Confirm grading action"
      >
        This will{' '}
        {confirmAction === 'publish'
          ? 'publish grades'
          : confirmAction === 'hide'
            ? 'hide published results'
            : 'mark grading complete'}{' '}
        for this submission.
      </ConfirmDialog>
    </section>
  )
}
