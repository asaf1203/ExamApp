/**
 * Student view: fetch available exams or a single exam by ID and show a
 * read-only question preview.
 */
import { useEffect, useState } from 'react'
import { getAllExams, getExamById } from './api/examService'

function StudentPortal() {
  const [examId, setExamId] = useState('')
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableExams, setAvailableExams] = useState([])
  const [availableLoading, setAvailableLoading] = useState(true)
  const [availableError, setAvailableError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadAvailableExams = async () => {
      try {
        setAvailableLoading(true)
        setAvailableError('')

        const examData = await getAllExams()

        if (isActive) {
          setAvailableExams(examData)
        }
      } catch (err) {
        if (isActive) {
          setAvailableError(err.message)
        }
      } finally {
        if (isActive) {
          setAvailableLoading(false)
        }
      }
    }

    loadAvailableExams()

    return () => {
      isActive = false
    }
  }, [])

  const handleStartExam = async (event) => {
    event.preventDefault()

    if (!examId.trim()) {
      setExam(null)
      setError('Please enter an exam ID.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const selectedExam = await getExamById(examId)
      setExamId(selectedExam.id)
      setExam(selectedExam)
    } catch (err) {
      setExam(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStartExam = (selectedExam) => {
    setExamId(selectedExam.id)
    setExam(selectedExam)
    setError('')
  }

  return (
    <section className="text-start">
      <div className="mb-4">
        <p className="text-uppercase text-secondary fw-semibold small mb-1">
          Student
        </p>
        <h1 className="h3 mb-1">Student Portal</h1>
        <p className="text-secondary mb-0">
          Pick an available exam or enter an exam ID.
        </p>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form className="row g-3" onSubmit={handleStartExam}>
            <div className="col-12 col-md">
              <label className="form-label" htmlFor="examId">
                Enter Exam ID to Start
              </label>
              <input
                className="form-control"
                id="examId"
                onChange={(event) => setExamId(event.target.value)}
                placeholder="EX-101"
                type="text"
                value={examId}
              />
            </div>
            <div className="col-12 col-md-auto align-self-end">
              <button
                className="btn btn-primary w-100"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Fetching...' : 'Start Exam'}
              </button>
            </div>
          </form>

          {error && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-header bg-white">
          <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
            <div>
              <h2 className="h5 mb-1">Available Exams</h2>
              <p className="text-secondary mb-0">
                Choose one to start without typing an ID.
              </p>
            </div>
            <span className="badge text-bg-primary align-self-md-start">
              {availableExams.length} available
            </span>
          </div>
        </div>

        {availableLoading && (
          <div className="card-body">
            <div className="alert alert-info mb-0" role="status">
              Loading available exams...
            </div>
          </div>
        )}

        {availableError && (
          <div className="card-body">
            <div className="alert alert-danger mb-0" role="alert">
              {availableError}
            </div>
          </div>
        )}

        {!availableLoading && !availableError && (
          <div className="list-group list-group-flush">
            {availableExams.map((availableExam) => {
              const isSelected = exam?.id === availableExam.id

              return (
                <button
                  aria-label={`Quick start ${availableExam.title}`}
                  className={`list-group-item list-group-item-action ${
                    isSelected ? 'active' : ''
                  }`}
                  disabled={loading}
                  key={availableExam.id}
                  onClick={() => handleQuickStartExam(availableExam)}
                  type="button"
                >
                  <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold">{availableExam.title}</div>
                      <div className={isSelected ? '' : 'text-secondary'}>
                        {availableExam.id} - {availableExam.description}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-start">
                      <span
                        className={`badge ${
                          isSelected
                            ? 'text-bg-light'
                            : 'text-bg-light border'
                        }`}
                      >
                        {availableExam.durationMinutes} min
                      </span>
                      <span
                        className={`badge ${
                          isSelected
                            ? 'text-bg-light'
                            : 'text-bg-secondary'
                        }`}
                      >
                        {availableExam.questions.length} questions
                      </span>
                      <span
                        className={`badge ${
                          isSelected
                            ? 'text-bg-light'
                            : 'text-bg-primary'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Quick start'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Shown only after a successful getExamById */}
      {exam && (
        <div className="card shadow-sm mt-4">
          <div className="card-header bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
              <div>
                <h2 className="h5 mb-1">{exam.title}</h2>
                <p className="text-secondary mb-0">{exam.description}</p>
              </div>
              <span className="badge text-bg-light border align-self-md-start">
                {exam.durationMinutes} minutes
              </span>
            </div>
          </div>
          <div className="card-body">
            <p className="fw-semibold mb-3">Questions preview</p>
            <ol className="list-group list-group-numbered">
              {exam.questions.map((question) => (
                <li
                  className="list-group-item d-flex justify-content-between gap-3"
                  key={question.id}
                >
                  <span>{question.prompt}</span>
                  <span className="text-nowrap text-secondary">
                    {question.points} pts
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}

export default StudentPortal
