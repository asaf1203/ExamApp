import {
  QUESTION_TYPES,
  normalizeAnswerForQuestion,
  normalizeOptions,
} from '../../../models/examModels'

export function QuestionRenderer({ disabled = false, onChange, question, value }) {
  const normalizedValue = normalizeAnswerForQuestion(question, value)
  const inputName = `question-${question.id}`

  if (question.type === QUESTION_TYPES.multipleChoice) {
    const selectedValues = new Set(normalizedValue)

    return (
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend className="question-prompt">{question.prompt}</legend>
        <div className="choice-stack">
          {normalizeOptions(question).map((option) => (
            <label className="choice-option" key={option.id}>
              <input
                checked={selectedValues.has(option.id)}
                onChange={(event) => {
                  const nextValues = new Set(selectedValues)

                  if (event.target.checked) {
                    nextValues.add(option.id)
                  } else {
                    nextValues.delete(option.id)
                  }

                  onChange([...nextValues])
                }}
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (
    question.type === QUESTION_TYPES.singleChoice ||
    question.type === 'multiple-choice'
  ) {
    return (
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend className="question-prompt">{question.prompt}</legend>
        <div className="choice-stack">
          {normalizeOptions(question).map((option) => (
            <label className="choice-option" key={option.id}>
              <input
                checked={normalizedValue === option.id}
                name={inputName}
                onChange={() => onChange(option.id)}
                type="radio"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (question.type === QUESTION_TYPES.longText) {
    return (
      <div className="question-fieldset">
        <label className="question-prompt" htmlFor={inputName}>
          {question.prompt}
        </label>
        <textarea
          className="form-control answer-textarea"
          disabled={disabled}
          id={inputName}
          onChange={(event) => onChange(event.target.value)}
          rows={7}
          value={normalizedValue}
        />
      </div>
    )
  }

  return (
    <div className="question-fieldset">
      <label className="question-prompt" htmlFor={inputName}>
        {question.prompt}
      </label>
      <input
        className="form-control"
        disabled={disabled}
        id={inputName}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={normalizedValue}
      />
    </div>
  )
}
