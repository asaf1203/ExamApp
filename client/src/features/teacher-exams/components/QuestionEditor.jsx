import { QUESTION_TYPES } from '../../../models/examModels'
import {
  TEACHER_QUESTION_TYPE_CONFIG,
  createEmptyTeacherQuestion,
} from '../../../models/teacherModels'

const createOptionId = (index) => String.fromCharCode(65 + index)

const fallbackQuestionTypes = Object.entries(TEACHER_QUESTION_TYPE_CONFIG).map(
  ([type, config]) => ({
    ...config,
    enabled: true,
    type,
  }),
)

const getQuestionTypeOptions = (questionTypes, currentType) => {
  const configuredTypes = questionTypes?.length ? questionTypes : fallbackQuestionTypes
  const enabledTypes = configuredTypes.filter((questionType) => questionType.enabled)
  const currentTypeConfig = configuredTypes.find(
    (questionType) => questionType.type === currentType,
  )

  if (
    currentTypeConfig &&
    !enabledTypes.some((questionType) => questionType.type === currentType)
  ) {
    return [...enabledTypes, currentTypeConfig]
  }

  return enabledTypes
}

function ChoiceOptionEditor({ option, index, onChange, onDelete }) {
  return (
    <div className="choice-editor-row">
      <span className="choice-letter">{option.id || createOptionId(index)}</span>
      <input
        aria-label={`Option ${index + 1}`}
        className="form-control"
        onChange={(event) => onChange({ ...option, label: event.target.value })}
        placeholder={`Option ${index + 1}`}
        type="text"
        value={option.label}
      />
      <button
        className="btn btn-sm btn-outline-danger"
        disabled={index < 2}
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>
  )
}

export function QuestionEditor({
  index,
  onChange,
  onDelete,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  question,
  questionTypes = fallbackQuestionTypes,
  total,
}) {
  const questionTypeOptions = getQuestionTypeOptions(questionTypes, question.type)
  const typeConfig =
    questionTypes.find((questionType) => questionType.type === question.type) ??
    TEACHER_QUESTION_TYPE_CONFIG[question.type]
  const supportsOptions = typeConfig?.supportsOptions
  const update = (patch) => onChange({ ...question, ...patch })
  const options = question.options ?? []

  const updateOption = (optionIndex, option) => {
    const nextOptions = [...options]
    nextOptions[optionIndex] = option
    update({ options: nextOptions })
  }

  const deleteOption = (optionIndex) => {
    const nextOptions = options.filter((_, currentIndex) => currentIndex !== optionIndex)
    update({ options: nextOptions })
  }

  const addOption = () => {
    update({
      options: [
        ...options,
        {
          id: createOptionId(options.length),
          label: '',
        },
      ],
    })
  }

  const handleTypeChange = (nextType) => {
    const nextQuestion = {
      ...createEmptyTeacherQuestion(nextType),
      id: question.id,
      points: question.points,
      prompt: question.prompt,
      required: question.required,
    }

    onChange(nextQuestion)
  }

  return (
    <article className="question-card question-editor-card">
      <div className="question-card-header">
        <div>
          <span>Question {index + 1}</span>
          <h3 className="h6 mb-0">
            {typeConfig?.label ?? 'Question'} · {question.points || 0} pts
          </h3>
        </div>
        <div className="table-actions">
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={index === 0}
            onClick={onMoveUp}
            type="button"
          >
            Up
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={index === total - 1}
            onClick={onMoveDown}
            type="button"
          >
            Down
          </button>
          <button className="btn btn-sm btn-outline-primary" onClick={onDuplicate} type="button">
            Duplicate
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={onDelete} type="button">
            Delete
          </button>
        </div>
      </div>

      <div className="builder-form-grid">
        <div className="form-field span-2">
          <label className="form-label" htmlFor={`${question.id}-prompt`}>
            Prompt
          </label>
          <textarea
            className="form-control"
            id={`${question.id}-prompt`}
            onChange={(event) => update({ prompt: event.target.value })}
            rows={3}
            value={question.prompt}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={`${question.id}-type`}>
            Type
          </label>
          <select
            className="form-select"
            id={`${question.id}-type`}
            onChange={(event) => handleTypeChange(event.target.value)}
            value={question.type}
          >
            {questionTypeOptions.map((questionType) => (
              <option key={questionType.type} value={questionType.type}>
                {questionType.label}
                {questionType.enabled ? '' : ' (disabled)'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={`${question.id}-points`}>
            Points
          </label>
          <input
            className="form-control"
            id={`${question.id}-points`}
            min="1"
            onChange={(event) => update({ points: Number(event.target.value) })}
            type="number"
            value={question.points}
          />
        </div>

        <label className="choice-option span-2">
          <input
            checked={question.required}
            onChange={(event) => update({ required: event.target.checked })}
            type="checkbox"
          />
          <span>Required question</span>
        </label>

        <div className="form-field span-2">
          <label className="form-label" htmlFor={`${question.id}-explanation`}>
            Explanation or grading note
          </label>
          <input
            className="form-control"
            id={`${question.id}-explanation`}
            onChange={(event) => update({ explanation: event.target.value })}
            placeholder="Optional teacher-facing note"
            type="text"
            value={question.explanation ?? ''}
          />
        </div>
      </div>

      {supportsOptions && (
        <section className="nested-panel mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="h6 mb-0">Options</h4>
              <p className="text-secondary small mb-0">{typeConfig.description}</p>
            </div>
            <button className="btn btn-sm btn-outline-primary" onClick={addOption} type="button">
              Add Option
            </button>
          </div>

          <div className="choice-editor-list">
            {options.map((option, optionIndex) => (
              <ChoiceOptionEditor
                index={optionIndex}
                key={`${question.id}-${option.id}-${optionIndex}`}
                onChange={(nextOption) => updateOption(optionIndex, nextOption)}
                onDelete={() => deleteOption(optionIndex)}
                option={option}
              />
            ))}
          </div>

          {question.type === QUESTION_TYPES.singleChoice ? (
            <div className="form-field mt-3">
              <label className="form-label" htmlFor={`${question.id}-correct`}>
                Correct answer
              </label>
              <select
                className="form-select"
                id={`${question.id}-correct`}
                onChange={(event) => update({ correctAnswer: event.target.value })}
                value={question.correctAnswer ?? ''}
              >
                <option value="">Choose answer</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label || option.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="choice-stack mt-3">
              <span className="form-label mb-0">Correct answers</span>
              {options.map((option) => {
                const selected = new Set(question.correctAnswers ?? [])

                return (
                  <label className="choice-option" key={`${question.id}-correct-${option.id}`}>
                    <input
                      checked={selected.has(option.id)}
                      onChange={(event) => {
                        const nextSelected = new Set(selected)

                        if (event.target.checked) {
                          nextSelected.add(option.id)
                        } else {
                          nextSelected.delete(option.id)
                        }

                        update({ correctAnswers: [...nextSelected] })
                      }}
                      type="checkbox"
                    />
                    <span>{option.label || option.id}</span>
                  </label>
                )
              })}
            </div>
          )}
        </section>
      )}

      {!supportsOptions && (
        <section className="nested-panel mt-3">
          <div className="builder-form-grid">
            <div className="form-field span-2">
              <label className="form-label" htmlFor={`${question.id}-sample`}>
                Sample answer
              </label>
              <textarea
                className="form-control"
                id={`${question.id}-sample`}
                onChange={(event) => update({ sampleAnswer: event.target.value })}
                rows={3}
                value={question.sampleAnswer ?? ''}
              />
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor={`${question.id}-keywords`}>
                Accepted keywords
              </label>
              <input
                className="form-control"
                id={`${question.id}-keywords`}
                onChange={(event) =>
                  update({
                    acceptedKeywords: event.target.value
                      .split(',')
                      .map((keyword) => keyword.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="service, token, role"
                type="text"
                value={(question.acceptedKeywords ?? []).join(', ')}
              />
            </div>
          </div>
        </section>
      )}

      <div className="attachments-placeholder mt-3">
        <strong>Attachments</strong>
        <span>Placeholder for future file uploads and rich media.</span>
      </div>
    </article>
  )
}
