import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherDashboard from '../src/TeacherDashboard'
import {
  archiveTeacherExam,
  deleteTeacherExam,
  duplicateTeacherExam,
  listTeacherDashboard,
  publishTeacherExam,
  unpublishTeacherExam,
} from '../src/api/teacherService'
import { ROUTES, RouterProvider } from '../src/routing/router'
import { ToastProvider } from '../src/ui/ToastContext'

vi.mock('../src/api/teacherService', () => ({
  archiveTeacherExam: vi.fn(),
  deleteTeacherExam: vi.fn(),
  duplicateTeacherExam: vi.fn(),
  listTeacherDashboard: vi.fn(),
  publishTeacherExam: vi.fn(),
  unpublishTeacherExam: vi.fn(),
}))

const dashboard = {
  activity: [
    {
      id: 'ACT-1',
      createdAt: '2026-04-21T09:30:00Z',
      message: 'Published Production Frontend Architecture.',
      type: 'exam',
    },
  ],
  exams: [
    {
      id: 'TEX-101',
      description: 'Covers REST boundaries and resilient UI flows.',
      durationMinutes: 75,
      pendingGrading: 2,
      questions: [{ id: 'TQ-101-1' }, { id: 'TQ-101-2' }],
      status: 'published',
      submissionsCount: 5,
      title: 'Production Frontend Architecture',
      updatedAt: '2026-04-24T13:05:00Z',
    },
    {
      id: 'TEX-202',
      description: 'Draft exam for React state and controlled forms.',
      durationMinutes: 45,
      pendingGrading: 0,
      questions: [{ id: 'TQ-202-1' }],
      status: 'draft',
      submissionsCount: 0,
      title: 'React State Workshop',
      updatedAt: '2026-04-20T08:15:00Z',
    },
  ],
  recentlyGraded: [
    {
      id: 'SUB-1',
      status: 'published',
      studentName: 'Maya Rosen',
      submittedAt: '2026-04-21T09:30:00Z',
    },
  ],
  stats: {
    archivedExams: 0,
    draftExams: 1,
    pendingGrading: 2,
    publishedExams: 1,
    totalExams: 2,
    totalSubmissions: 5,
  },
}

const renderDashboard = () => {
  window.location.hash = ROUTES.teacherDashboard

  return render(
    <RouterProvider>
      <ToastProvider>
        <TeacherDashboard />
      </ToastProvider>
    </RouterProvider>,
  )
}

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listTeacherDashboard.mockResolvedValue(dashboard)
    archiveTeacherExam.mockResolvedValue({})
    deleteTeacherExam.mockResolvedValue({})
    duplicateTeacherExam.mockResolvedValue({ id: 'TEX-303' })
    publishTeacherExam.mockResolvedValue({})
    unpublishTeacherExam.mockResolvedValue({})
  })

  it('shows a loading status while the teacher dashboard is being fetched', () => {
    listTeacherDashboard.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(
      screen.getByRole('status', { name: /loading teacher dashboard/i }),
    ).toBeInTheDocument()
  })

  it('renders fetched exams, stats, recent grading, and activity', async () => {
    renderDashboard()

    expect(
      await screen.findByText('Production Frontend Architecture'),
    ).toBeInTheDocument()
    expect(screen.getByText('React State Workshop')).toBeInTheDocument()
    expect(screen.getByText('Total Exams')).toBeInTheDocument()
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0)
    expect(screen.getByText('Pending Grading')).toBeInTheDocument()
    expect(screen.getByText('1h 15m')).toBeInTheDocument()
    expect(screen.getByText('2 pending')).toBeInTheDocument()
    expect(screen.getByText('Maya Rosen')).toBeInTheDocument()
    expect(
      screen.getByText('Published Production Frontend Architecture.'),
    ).toBeInTheDocument()
    expect(listTeacherDashboard).toHaveBeenCalledWith({ search: '' })
  })

  it('opens a confirmation flow before publishing a draft exam', async () => {
    renderDashboard()

    await screen.findByText('React State Workshop')
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }))

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'This will publish the selected exam.',
    )

    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

    await waitFor(() => {
      expect(publishTeacherExam).toHaveBeenCalledWith('TEX-202')
    })
  })

  it('shows an error message when the dashboard service fails', async () => {
    listTeacherDashboard.mockRejectedValue(new Error('Unable to load teacher dashboard.'))

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load teacher dashboard.',
    )
    expect(
      screen.queryByText('Production Frontend Architecture'),
    ).not.toBeInTheDocument()
  })
})
