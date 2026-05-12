/**
 * In-memory seed data for the mock exam platform. Replaces a database until a
 * real API exists. Shape mirrors expected future REST payloads.
 */
export const mockDb = {
  exams: [
    {
      id: 'EX-101',
      title: 'Full Stack Foundations',
      description: 'Covers HTML, CSS, JavaScript, HTTP, and basic React.',
      durationMinutes: 60,
      createdBy: 'Dr. Cohen',
      questions: [
        {
          id: 'Q-101-1',
          type: 'multiple-choice',
          prompt: 'Which HTTP method is typically used to create a resource?',
          points: 10,
          options: ['GET', 'POST', 'PATCH', 'DELETE'],
          correctAnswer: 'POST',
        },
        {
          id: 'Q-101-2',
          type: 'multiple-choice',
          prompt: 'What does JSX compile into?',
          points: 10,
          options: [
            'Plain HTML files',
            'React element calls',
            'CSS modules',
            'SQL queries',
          ],
          correctAnswer: 'React element calls',
        },
        {
          id: 'Q-101-3',
          type: 'short-answer',
          prompt: 'Name one benefit of separating client and server code.',
          points: 15,
          correctAnswer: 'Clear responsibilities and easier maintenance.',
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
          type: 'multiple-choice',
          prompt: 'Which hook is commonly used to fetch data after render?',
          points: 10,
          options: ['useMemo', 'useEffect', 'useRef', 'useCallback'],
          correctAnswer: 'useEffect',
        },
        {
          id: 'Q-202-2',
          type: 'multiple-choice',
          prompt: 'What should React list items usually include?',
          points: 10,
          options: ['A random number', 'A key prop', 'A class component', 'A reducer'],
          correctAnswer: 'A key prop',
        },
        {
          id: 'Q-202-3',
          type: 'code',
          prompt: 'Write a simple state update that increments a counter.',
          points: 20,
          correctAnswer: 'setCount((count) => count + 1)',
        },
      ],
    },
    {
      id: 'EX-303',
      title: 'Database and API Design',
      description: 'Focuses on REST resources, validation, and persistence.',
      durationMinutes: 75,
      createdBy: 'Ms. Bar',
      questions: [
        {
          id: 'Q-303-1',
          type: 'multiple-choice',
          prompt: 'Which status code usually means a resource was created?',
          points: 10,
          options: ['200', '201', '301', '500'],
          correctAnswer: '201',
        },
        {
          id: 'Q-303-2',
          type: 'short-answer',
          prompt: 'Why should backend APIs validate incoming request bodies?',
          points: 15,
          correctAnswer: 'To protect data integrity and reject invalid input.',
        },
        {
          id: 'Q-303-3',
          type: 'multiple-choice',
          prompt: 'Which field is commonly used to link a score to an exam?',
          points: 10,
          options: ['examId', 'styleId', 'browserId', 'assetId'],
          correctAnswer: 'examId',
        },
      ],
    },
  ],
  // Graded attempts; examId ties each record to exams[].id for dashboard stats
  studentScores: [
    {
      id: 'SC-9001',
      studentId: 'STU-12',
      studentName: 'Maya Rosen',
      examId: 'EX-101',
      score: 29,
      maxScore: 35,
      submittedAt: '2026-04-21T09:30:00Z',
      answers: [
        { questionId: 'Q-101-1', answer: 'POST', isCorrect: true },
        { questionId: 'Q-101-2', answer: 'React element calls', isCorrect: true },
        {
          questionId: 'Q-101-3',
          answer: 'Makes each side easier to change',
          isCorrect: true,
        },
      ],
    },
    {
      id: 'SC-9002',
      studentId: 'STU-18',
      studentName: 'Daniel Amir',
      examId: 'EX-202',
      score: 32,
      maxScore: 40,
      submittedAt: '2026-04-24T13:05:00Z',
      answers: [
        { questionId: 'Q-202-1', answer: 'useEffect', isCorrect: true },
        { questionId: 'Q-202-2', answer: 'A key prop', isCorrect: true },
        {
          questionId: 'Q-202-3',
          answer: 'setCount(count + 1)',
          isCorrect: false,
        },
      ],
    },
    {
      id: 'SC-9003',
      studentId: 'STU-25',
      studentName: 'Noa Katz',
      examId: 'EX-303',
      score: 28,
      maxScore: 35,
      submittedAt: '2026-04-27T15:45:00Z',
      answers: [
        { questionId: 'Q-303-1', answer: '201', isCorrect: true },
        {
          questionId: 'Q-303-2',
          answer: 'To prevent malformed data from being saved',
          isCorrect: true,
        },
        { questionId: 'Q-303-3', answer: 'examId', isCorrect: true },
      ],
    },
  ],
}
