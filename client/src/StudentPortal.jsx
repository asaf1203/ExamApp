import { useState } from 'react'
import { getExamById } from './api/examService'

function StudentPortal() {
  const [examId, setExamId] = useState('')
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setExam(selectedExam)
    } catch (err) {
      setExam(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="text-start">
      <div className="mb-4">
        <p className="text-uppercase text-secondary fw-semibold small mb-1">
          Student
        </p>
        <h1 className="h3 mb-1">Student Portal</h1>
        <p className="text-secondary mb-0">
          Enter an exam ID such as EX-101, EX-202, or EX-303.
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
