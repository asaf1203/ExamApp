import { useEffect, useMemo, useState } from 'react'
import {
  listTeacherQuestionTypes,
  resetTeacherQuestionTypes,
  saveTeacherQuestionTypes,
} from '../../../api/questionTypeService'
import { LoadingState } from '../../../components/LoadingState'
import { useToast } from '../../../ui/ToastContext'

function TypeMetric({ label, value }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function QuestionTypeRow({ onChange, questionType }) {
  return (
    <article className="question-type-card">
      <div className="question-type-main">
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span
              className={`status-badge ${
                questionType.enabled ? 'status-badge-active' : 'status-badge-neutral'
              }`}
            >
              {questionType.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="text-secondary small">{questionType.type}</span>
          </div>
          <h2 className="h5 mb-1">{questionType.label}</h2>
          <p className="text-secondary mb-0">{questionType.description}</p>
        </div>

        <dl className="detail-list compact mb-0">
          <div>
            <dt>Answer mode</dt>
            <dd>{questionType.answerMode}</dd>
          </div>
          <div>
            <dt>Options</dt>
            <dd>{questionType.supportsOptions ? 'Required' : 'Not used'}</dd>
          </div>
        </dl>
      </div>

      <div className="question-type-controls">
        <label className="choice-option mb-0">
          <input
            checked={questionType.enabled}
            onChange={(event) =>
              onChange(questionType.type, { enabled: event.target.checked })
            }
            type="checkbox"
          />
          <span>Available in builder</span>
        </label>

        <div className="form-field">
          <label className="form-label" htmlFor={`${questionType.type}-points`}>
            Default points
          </label>
          <input
            className="form-control"
            id={`${questionType.type}-points`}
            min="1"
            onChange={(event) =>
              onChange(questionType.type, {
                defaultPoints: Number(event.target.value),
              })
            }
            type="number"
            value={questionType.defaultPoints}
          />
        </div>
      </div>
    </article>
  )
}

export function TeacherQuestionTypesPage() {
  const { notify } = useToast()
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [questionTypes, setQuestionTypes] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await listTeacherQuestionTypes()

        if (isActive) {
          setQuestionTypes(result)
          setDirty(false)
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
  }, [])

  const metrics = useMemo(() => {
    const enabled = questionTypes.filter((questionType) => questionType.enabled)
    const choiceBased = questionTypes.filter((questionType) => questionType.supportsOptions)

    return {
      choiceBased: choiceBased.length,
      enabled: enabled.length,
      textBased: questionTypes.length - choiceBased.length,
      total: questionTypes.length,
    }
  }, [questionTypes])

  const updateQuestionType = (type, patch) => {
    setQuestionTypes((current) =>
      current.map((questionType) =>
        questionType.type === type ? { ...questionType, ...patch } : questionType,
      ),
    )
    setDirty(true)
    setError('')
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const result = await saveTeacherQuestionTypes(questionTypes)
      setQuestionTypes(result)
      setDirty(false)
      notify({ message: 'Question type settings saved.', tone: 'success' })
    } catch (err) {
      setError(err.message)
      notify({ message: err.message, tone: 'danger', title: 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    try {
      setSaving(true)
      const result = await resetTeacherQuestionTypes()
      setQuestionTypes(result)
      setDirty(false)
      notify({ message: 'Question type settings reset.', tone: 'success' })
    } catch (err) {
      setError(err.message)
      notify({ message: err.message, tone: 'danger', title: 'Reset failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Question Type Management</p>
          <h1>Question Types</h1>
          <p className="text-secondary mb-0">
            Control which supported question types lecturers can add to exams.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-primary"
            disabled={saving}
            onClick={resetSettings}
            type="button"
          >
            Reset Defaults
          </button>
          <button
            className="btn btn-primary"
            disabled={!dirty || saving}
            onClick={saveSettings}
            type="button"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <TypeMetric label="Supported Types" value={metrics.total} />
        <TypeMetric label="Enabled" value={metrics.enabled} />
        <TypeMetric label="Choice Based" value={metrics.choiceBased} />
        <TypeMetric label="Text Based" value={metrics.textBased} />
      </div>

      <section className="app-panel p-3 p-md-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h5 mb-1">Builder Availability</h2>
            <p className="text-secondary mb-0">
              Disabled types remain readable on existing exams but cannot be added as new
              questions.
            </p>
          </div>
          {dirty && <span className="status-badge status-badge-info">Unsaved changes</span>}
        </div>

        {loading && <LoadingState label="Loading question types" rows={4} />}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="question-type-list">
            {questionTypes.map((questionType) => (
              <QuestionTypeRow
                key={questionType.type}
                onChange={updateQuestionType}
                questionType={questionType}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
