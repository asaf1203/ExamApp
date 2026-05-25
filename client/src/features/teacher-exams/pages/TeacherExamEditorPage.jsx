import { useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveTeacherExam,
  autosaveTeacherExam,
  createTeacherExam,
  deleteTeacherExam,
  getTeacherExam,
  publishTeacherExam,
  saveTeacherExam,
  unpublishTeacherExam,
} from '../../../api/teacherService'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { LoadingState } from '../../../components/LoadingState'
import { useAuth } from '../../../auth/authState'
import { useBeforeUnload } from '../../../hooks/useBeforeUnload'
import { QUESTION_TYPES } from '../../../models/examModels'
import {
  TEACHER_EXAM_STATUSES,
  TEACHER_QUESTION_TYPE_CONFIG,
  createEmptyTeacherExam,
  createEmptyTeacherQuestion,
  getTeacherExamMaxScore,
} from '../../../models/teacherModels'
import {
  ROUTES,
  buildTeacherExamEditorPath,
  buildTeacherExamPreviewPath,
  useRouter,
} from '../../../routing/router'
import { useToast } from '../../../ui/ToastContext'
import { formatDateTime } from '../../../utils/dateTime'
import { QuestionEditor } from '../components/QuestionEditor'
import { TeacherExamStatusBadge } from '../components/TeacherStatusBadge'

const builderTabs = [
  { label: 'Basics', value: 'basics' },
  { label: 'Questions', value: 'questions' },
  { label: 'Publish', value: 'publish' },
]

const newDraftStorageKey = 'examPlatform.teacher.newExamDraft'

const getInitialExam = (teacherId, isCreate) => {
  if (!isCreate) {
    return createEmptyTeacherExam(teacherId)
  }

  try {
    const savedDraft = window.localStorage?.getItem?.(newDraftStorageKey)

    return savedDraft ? JSON.parse(savedDraft) : createEmptyTeacherExam(teacherId)
  } catch {
    return createEmptyTeacherExam(teacherId)
  }
}

const normalizeCreateExam = (exam) => ({
  ...exam,
  title: exam.title.trim() || 'Untitled Exam',
})

function validateExam(exam) {
  const errors = []

  if (!exam.title.trim()) {
    errors.push('Title is required.')
  }

  if (!exam.description.trim()) {
    errors.push('Description is required.')
  }

  if (!exam.instructions.trim()) {
    errors.push('Instructions are required.')
  }

  if (Number(exam.durationMinutes) < 5) {
    errors.push('Duration must be at least 5 minutes.')
  }

  if (Number(exam.passingGrade) < 0 || Number(exam.passingGrade) > 100) {
    errors.push('Passing grade must be between 0 and 100.')
  }

  if (!exam.availability.opensAt || !exam.availability.dueAt) {
    errors.push('Availability dates are required before publishing.')
  }

  if (exam.questions.length === 0) {
    errors.push('Add at least one question.')
  }

  exam.questions.forEach((question, index) => {
    if (!question.prompt.trim()) {
      errors.push(`Question ${index + 1} needs a prompt.`)
    }

    if (Number(question.points) <= 0) {
      errors.push(`Question ${index + 1} needs points greater than zero.`)
    }

    if (TEACHER_QUESTION_TYPE_CONFIG[question.type]?.supportsOptions) {
      const filledOptions = (question.options ?? []).filter((option) =>
        option.label.trim(),
      )

      if (filledOptions.length < 2) {
        errors.push(`Question ${index + 1} needs at least two options.`)
      }
    }
  })

  return errors
}

function PreviewPanel({ exam }) {
  return (
    <article className="app-panel p-3 p-md-4">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <p className="eyebrow">Student Preview</p>
          <h2 className="h5 mb-1">{exam.title || 'Untitled Exam'}</h2>
          <p className="text-secondary mb-0">{exam.description || 'No description yet.'}</p>
        </div>
        <TeacherExamStatusBadge status={exam.status} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>Duration</dt>
          <dd>{exam.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Passing grade</dt>
          <dd>{exam.passingGrade}%</dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>{exam.maxAttempts}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{getTeacherExamMaxScore(exam)} pts</dd>
        </div>
      </dl>
      <ol className="question-overview mt-3">
        {exam.questions.map((question) => (
          <li key={question.id}>
            <span>{question.prompt || 'Untitled question'}</span>
            <strong>{question.points} pts</strong>
          </li>
        ))}
      </ol>
    </article>
  )
}

export function TeacherExamEditorPage({ examId = null, mode = 'edit' }) {
  const { currentUser } = useAuth()
  const { navigate } = useRouter()
  const { notify } = useToast()
  const [activeTab, setActiveTab] = useState('basics')
  const [confirmAction, setConfirmAction] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [exam, setExam] = useState(() =>
    getInitialExam(currentUser.id, mode === 'create'),
  )
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(mode !== 'create')
  const [saveState, setSaveState] = useState('saved')
  const [saving, setSaving] = useState(false)
  const examRef = useRef(exam)
  const isCreate = mode === 'create'
  const currentExamId = exam.id || examId

  useEffect(() => {
    examRef.current = exam
  }, [exam])

  useBeforeUnload(dirty)

  useEffect(() => {
    if (isCreate) {
      return undefined
    }

    let isActive = true

    const loadExam = async () => {
      try {
        setLoading(true)
        const result = await getTeacherExam(examId)

        if (isActive) {
          setExam(result)
          setDirty(false)
          setSaveState('saved')
        }
      } catch (err) {
        if (isActive) {
          setErrors([err.message])
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
  }, [currentUser.id, examId, isCreate])

  useEffect(() => {
    if (!dirty) {
      return undefined
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        if (isCreate) {
          window.localStorage?.setItem?.(newDraftStorageKey, JSON.stringify(examRef.current))
        } else if (currentExamId) {
          await autosaveTeacherExam(currentExamId, examRef.current)
        }

        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentExamId, dirty, isCreate])

  const updateExam = (patch) => {
    setExam((current) => ({ ...current, ...patch }))
    setDirty(true)
    setSaveState('dirty')
    setErrors([])
  }

  const updateAvailability = (patch) => {
    updateExam({
      availability: {
        ...exam.availability,
        ...patch,
      },
    })
  }

  const updateQuestion = (questionId, nextQuestion) => {
    updateExam({
      questions: exam.questions.map((question) =>
        question.id === questionId ? nextQuestion : question,
      ),
    })
  }

  const addQuestion = (type = QUESTION_TYPES.singleChoice) => {
    updateExam({
      questions: [...exam.questions, createEmptyTeacherQuestion(type)],
    })
    setActiveTab('questions')
  }

  const duplicateQuestion = (questionId) => {
    const questionIndex = exam.questions.findIndex((question) => question.id === questionId)
    const question = exam.questions[questionIndex]
    const duplicate = {
      ...structuredClone(question),
      id: `${question.id}-copy-${exam.questions.length + 1}`,
      prompt: `${question.prompt} Copy`,
    }
    const nextQuestions = [...exam.questions]
    nextQuestions.splice(questionIndex + 1, 0, duplicate)
    updateExam({ questions: nextQuestions })
  }

  const deleteQuestion = (questionId) => {
    updateExam({
      questions:
        exam.questions.length > 1
          ? exam.questions.filter((question) => question.id !== questionId)
          : exam.questions,
    })
  }

  const moveQuestion = (questionId, direction) => {
    const index = exam.questions.findIndex((question) => question.id === questionId)
    const nextIndex = index + direction

    if (index < 0 || nextIndex < 0 || nextIndex >= exam.questions.length) {
      return
    }

    const nextQuestions = [...exam.questions]
    const [question] = nextQuestions.splice(index, 1)
    nextQuestions.splice(nextIndex, 0, question)
    updateExam({ questions: nextQuestions })
  }

  const handleSave = async () => {
    const nextErrors = validateExam(examRef.current)

    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      notify({ message: nextErrors[0], tone: 'danger', title: 'Validation failed' })
      return null
    }

    try {
      setSaving(true)
      const savedExam = isCreate
        ? await createTeacherExam(normalizeCreateExam(examRef.current))
        : await saveTeacherExam(currentExamId, examRef.current)

      setExam(savedExam)
      setDirty(false)
      setSaveState('saved')
      window.localStorage?.removeItem?.(newDraftStorageKey)
      notify({ message: 'Exam saved.', tone: 'success' })

      if (isCreate) {
        navigate(buildTeacherExamEditorPath(savedExam.id), { replace: true })
      }

      return savedExam
    } catch (err) {
      setErrors([err.message])
      notify({ message: err.message, tone: 'danger', title: 'Save failed' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const runConfirmedAction = async () => {
    try {
      let targetExam = exam

      if (confirmAction === 'publish') {
        targetExam = dirty ? await handleSave() : exam

        if (!targetExam?.id) {
          return
        }

        const publishedExam = await publishTeacherExam(targetExam.id)
        setExam(publishedExam)
        notify({ message: 'Exam published.', tone: 'success' })
      }

      if (confirmAction === 'unpublish') {
        const draftExam = await unpublishTeacherExam(currentExamId)
        setExam(draftExam)
        notify({ message: 'Exam unpublished.', tone: 'success' })
      }

      if (confirmAction === 'archive') {
        const archivedExam = await archiveTeacherExam(currentExamId)
        setExam(archivedExam)
        notify({ message: 'Exam archived.', tone: 'success' })
      }

      if (confirmAction === 'delete') {
        await deleteTeacherExam(currentExamId)
        notify({ message: 'Exam deleted.', tone: 'success' })
        navigate(ROUTES.teacherExams)
      }
    } catch (err) {
      notify({ message: err.message, tone: 'danger', title: 'Action failed' })
    } finally {
      setConfirmAction(null)
    }
  }

  const saveStateLabel = useMemo(() => {
    if (saving) {
      return 'Saving...'
    }

    if (saveState === 'dirty') {
      return 'Unsaved changes'
    }

    if (saveState === 'error') {
      return 'Autosave failed'
    }

    return exam.autosavedAt ? `Autosaved ${formatDateTime(exam.autosavedAt)}` : 'Saved'
  }, [exam.autosavedAt, saveState, saving])

  if (loading) {
    return <LoadingState label="Loading exam editor" rows={6} />
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{isCreate ? 'Create Exam' : 'Exam Builder'}</p>
          <h1>{exam.title || 'Untitled Exam'}</h1>
          <p className="text-secondary mb-0">{saveStateLabel}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {!isCreate && <TeacherExamStatusBadge status={exam.status} />}
          <button
            className="btn btn-outline-primary"
            disabled={isCreate}
            onClick={() => navigate(buildTeacherExamPreviewPath(currentExamId))}
            type="button"
          >
            Preview
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <strong>Fix before continuing</strong>
          <ul className="mb-0 mt-2">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="builder-layout">
        <aside className="builder-sidebar">
          <div className="filter-tabs vertical" role="tablist" aria-label="Builder sections">
            {builderTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.value}
                className={activeTab === tab.value ? 'active' : ''}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <article className="app-panel p-3 mt-3">
            <h2 className="h6 mb-3">Exam Summary</h2>
            <dl className="detail-list compact">
              <div>
                <dt>Questions</dt>
                <dd>{exam.questions.length}</dd>
              </div>
              <div>
                <dt>Max score</dt>
                <dd>{getTeacherExamMaxScore(exam)} pts</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{exam.durationMinutes} min</dd>
              </div>
            </dl>
          </article>
        </aside>

        <div className="builder-main">
          {activeTab === 'basics' && (
            <section className="app-panel p-3 p-md-4">
              <h2 className="h5 mb-3">Basics</h2>
              <div className="builder-form-grid">
                <div className="form-field span-2">
                  <label className="form-label" htmlFor="teacherExamTitle">
                    Title
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamTitle"
                    onChange={(event) => updateExam({ title: event.target.value })}
                    type="text"
                    value={exam.title}
                  />
                </div>

                <div className="form-field span-2">
                  <label className="form-label" htmlFor="teacherExamDescription">
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    id="teacherExamDescription"
                    onChange={(event) => updateExam({ description: event.target.value })}
                    rows={3}
                    value={exam.description}
                  />
                </div>

                <div className="form-field span-2">
                  <label className="form-label" htmlFor="teacherExamInstructions">
                    Instructions
                  </label>
                  <textarea
                    className="form-control"
                    id="teacherExamInstructions"
                    onChange={(event) => updateExam({ instructions: event.target.value })}
                    rows={4}
                    value={exam.instructions}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="teacherExamDuration">
                    Duration
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamDuration"
                    min="5"
                    onChange={(event) =>
                      updateExam({ durationMinutes: Number(event.target.value) })
                    }
                    type="number"
                    value={exam.durationMinutes}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="teacherExamPassing">
                    Passing Grade
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamPassing"
                    max="100"
                    min="0"
                    onChange={(event) =>
                      updateExam({ passingGrade: Number(event.target.value) })
                    }
                    type="number"
                    value={exam.passingGrade}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="teacherExamAttempts">
                    Attempt Limit
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamAttempts"
                    min="1"
                    onChange={(event) =>
                      updateExam({ maxAttempts: Number(event.target.value) })
                    }
                    type="number"
                    value={exam.maxAttempts}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="teacherExamOpen">
                    Opens
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamOpen"
                    onChange={(event) => updateAvailability({ opensAt: event.target.value })}
                    type="datetime-local"
                    value={exam.availability.opensAt}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="teacherExamDue">
                    Due
                  </label>
                  <input
                    className="form-control"
                    id="teacherExamDue"
                    onChange={(event) => updateAvailability({ dueAt: event.target.value })}
                    type="datetime-local"
                    value={exam.availability.dueAt}
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'questions' && (
            <section className="page-stack">
              <div className="app-panel p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <h2 className="h5 mb-1">Questions</h2>
                    <p className="text-secondary mb-0">
                      Dynamic question editors are driven by centralized type config.
                    </p>
                  </div>
                  <div className="dropdown-actions">
                    {Object.entries(TEACHER_QUESTION_TYPE_CONFIG).map(([type, config]) => (
                      <button
                        className="btn btn-outline-primary"
                        key={type}
                        onClick={() => addQuestion(type)}
                        type="button"
                      >
                        Add {config.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {exam.questions.map((question, index) => (
                <QuestionEditor
                  index={index}
                  key={question.id}
                  onChange={(nextQuestion) => updateQuestion(question.id, nextQuestion)}
                  onDelete={() => deleteQuestion(question.id)}
                  onDuplicate={() => duplicateQuestion(question.id)}
                  onMoveDown={() => moveQuestion(question.id, 1)}
                  onMoveUp={() => moveQuestion(question.id, -1)}
                  question={question}
                  total={exam.questions.length}
                />
              ))}
            </section>
          )}

          {activeTab === 'publish' && (
            <section className="page-stack">
              <PreviewPanel exam={exam} />
              <section className="app-panel p-3 p-md-4">
                <h2 className="h5 mb-3">Publishing</h2>
                <p className="text-secondary">
                  Publishing makes this teacher-managed mock exam visible in the teacher
                  workspace. Student flow wiring can be connected later through the same
                  service boundary.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => setConfirmAction('publish')}
                    type="button"
                  >
                    Publish Exam
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    disabled={exam.status !== TEACHER_EXAM_STATUSES.published}
                    onClick={() => setConfirmAction('unpublish')}
                    type="button"
                  >
                    Unpublish
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    disabled={isCreate}
                    onClick={() => setConfirmAction('archive')}
                    type="button"
                  >
                    Archive
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    disabled={isCreate || exam.status === TEACHER_EXAM_STATUSES.published}
                    onClick={() => setConfirmAction('delete')}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </section>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        danger={confirmAction === 'delete'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        open={Boolean(confirmAction)}
        title="Confirm exam action"
      >
        This will {confirmAction} the exam.
      </ConfirmDialog>
    </section>
  )
}
