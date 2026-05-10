import { useEffect, useState } from 'react'
import { getAllExams, getStudentScores } from './api/examService'

function TeacherDashboard() {
  const [exams, setExams] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError('')

        const [examData, scoreData] = await Promise.all([
          getAllExams(),
          getStudentScores(),
        ])

        if (isActive) {
          setExams(examData)
          setScores(scoreData)
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

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [])

  const getSubmissionsCount = (examId) =>
    scores.filter((score) => score.examId === examId).length

  return (
    <section className="text-start">
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
        <div>
          <p className="text-uppercase text-secondary fw-semibold small mb-1">
            Teacher
          </p>
          <h1 className="h3 mb-1">Exam Dashboard</h1>
          <p className="text-secondary mb-0">
            Mock API data is loaded from the local exam service.
          </p>
        </div>
        <div className="align-self-md-center">
          <span className="badge text-bg-primary">{exams.length} exams</span>
        </div>
      </div>

      {loading && (
        <div className="alert alert-info mb-0" role="status">
          Loading exams...
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="row g-3">
          {exams.map((exam) => (
            <div className="col-12 col-lg-6" key={exam.id}>
              <article className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <h2 className="h5 card-title mb-1">{exam.title}</h2>
                      <p className="card-subtitle text-secondary">{exam.id}</p>
                    </div>
                    <span className="badge text-bg-light border">
                      {exam.durationMinutes} min
                    </span>
                  </div>

                  <p className="card-text mt-3">{exam.description}</p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className="badge text-bg-secondary">
                      {exam.questions.length} questions
                    </span>
                    <span className="badge text-bg-success">
                      {getSubmissionsCount(exam.id)} submissions
                    </span>
                    <span className="badge text-bg-info">
                      Created by {exam.createdBy}
                    </span>
                  </div>
                </div>
                <ul className="list-group list-group-flush">
                  {exam.questions.map((question) => (
                    <li className="list-group-item" key={question.id}>
                      <div className="d-flex justify-content-between gap-3">
                        <span>{question.prompt}</span>
                        <span className="text-nowrap text-secondary">
                          {question.points} pts
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default TeacherDashboard
