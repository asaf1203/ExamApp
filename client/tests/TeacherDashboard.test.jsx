import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherDashboard from '../src/TeacherDashboard'
import { getAllExams, getStudentScores } from '../src/api/examService'

vi.mock('../src/api/examService', () => ({
  getAllExams: vi.fn(),
  getStudentScores: vi.fn(),
}))

const exams = [
  {
    id: 'EX-101',
    title: 'Full Stack Foundations',
    description: 'Covers HTML, CSS, JavaScript, HTTP, and basic React.',
    durationMinutes: 60,
    createdBy: 'Dr. Cohen',
    questions: [
      {
        id: 'Q-101-1',
        prompt: 'Which HTTP method is typically used to create a resource?',
        points: 10,
      },
      {
        id: 'Q-101-2',
        prompt: 'What does JSX compile into?',
        points: 10,
      },
    ],
  },
  {
    id: 'EX-202',
    title: 'React State and Effects',
    description: 'Assesses component state, props, effects, and rendering.',
    durationMinutes: 45,
    createdBy: 'Prof. Levi',
    questions: [
      {
        id: 'Q-202-1',
        prompt: 'Which hook is commonly used to fetch data after render?',
        points: 10,
      },
    ],
  },
]

const scores = [
  {
    id: 'SC-9001',
    studentName: 'Maya Rosen',
    examId: 'EX-101',
    score: 29,
    maxScore: 35,
    submittedAt: '2026-04-21T09:30:00Z',
  },
  {
    id: 'SC-9002',
    studentName: 'Daniel Amir',
    examId: 'EX-101',
    score: 32,
    maxScore: 40,
    submittedAt: '2026-04-24T13:05:00Z',
  },
]

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAllExams.mockResolvedValue(exams)
    getStudentScores.mockResolvedValue(scores)
  })

  it('shows a loading status while exams are being fetched', () => {
    getAllExams.mockReturnValue(new Promise(() => {}))
    getStudentScores.mockReturnValue(new Promise(() => {}))

    render(<TeacherDashboard />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading exams...')
  })

  it('renders fetched exams with counts, metadata, and questions', async () => {
    render(<TeacherDashboard />)

    expect(await screen.findByText('Full Stack Foundations')).toBeInTheDocument()
    expect(screen.getByText('React State and Effects')).toBeInTheDocument()
    expect(screen.getByText('2 exams')).toBeInTheDocument()
    expect(screen.getByText('60 min')).toBeInTheDocument()
    expect(screen.getByText('Created by Dr. Cohen')).toBeInTheDocument()
    expect(screen.getByText('2 questions')).toBeInTheDocument()
    expect(screen.getByText('2 submissions')).toBeInTheDocument()
    expect(screen.getByText('0 submissions')).toBeInTheDocument()
    expect(
      screen.getByText('Which HTTP method is typically used to create a resource?'),
    ).toBeInTheDocument()
    expect(getAllExams).toHaveBeenCalledTimes(1)
    expect(getStudentScores).toHaveBeenCalledTimes(1)
  })

  it('expands and hides recent submissions for exams with scores', async () => {
    render(<TeacherDashboard />)

    const viewButton = await screen.findByRole('button', {
      name: /view submissions/i,
    })

    fireEvent.click(viewButton)

    const submissionsTable = screen.getByRole('table')
    expect(within(submissionsTable).getByText('Maya Rosen')).toBeInTheDocument()
    expect(within(submissionsTable).getByText('Daniel Amir')).toBeInTheDocument()
    expect(within(submissionsTable).getByText('29 / 35')).toBeInTheDocument()
    expect(within(submissionsTable).getByText('83%')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide submissions/i }))

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('does not render a submissions toggle for exams without scores', async () => {
    render(<TeacherDashboard />)

    expect(await screen.findByText('React State and Effects')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /view submissions/i })).toHaveLength(
      1,
    )
  })

  it('shows an error message when the dashboard service fails', async () => {
    getAllExams.mockRejectedValue(new Error('Unable to load teacher dashboard.'))

    render(<TeacherDashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load teacher dashboard.',
    )
    expect(screen.queryByText('Full Stack Foundations')).not.toBeInTheDocument()
  })
})
