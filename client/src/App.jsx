/**
 * Root layout: role toggle switches between teacher dashboard and student portal.
 * No real auth—state only simulates which UI branch is visible.
 */
import { useState } from 'react'
import './App.css'
import StudentPortal from './StudentPortal'
import TeacherDashboard from './TeacherDashboard'

function App() {
  // 'teacher' | 'student' — drives which child screen is shown below the header card
  const [role, setRole] = useState('teacher')
  const isTeacher = role === 'teacher'

  return (
    <main className="app-shell bg-body-tertiary">
      <div className="container py-4 py-md-5">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-start">
              <p className="text-uppercase text-primary fw-semibold small mb-1">
                E-Test System
              </p>
              <h1 className="h2 mb-1">Mock Exam Platform</h1>
              <p className="text-secondary mb-0">
                React components prepared for a future Node.js backend.
              </p>
            </div>

            {/* Simple role picker; replaces a real login until backend exists */}
            <div className="btn-group" role="group" aria-label="Role login">
              <button
                className={`btn ${isTeacher ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setRole('teacher')}
                type="button"
              >
                Teacher
              </button>
              <button
                className={`btn ${!isTeacher ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setRole('student')}
                type="button"
              >
                Student
              </button>
            </div>
          </div>
        </div>

        {isTeacher ? <TeacherDashboard /> : <StudentPortal />}
      </div>
    </main>
  )
}

export default App
