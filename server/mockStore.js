const { randomUUID } = require("crypto");

const ATTEMPT_STATUSES = {
  graded: "graded",
  inProgress: "in-progress",
  submitted: "submitted",
};

const EXAM_STATUSES = {
  archived: "archived",
  draft: "draft",
  published: "published",
};

const QUESTION_TYPES = {
  longText: "long-text",
  multipleChoice: "multiple-choice",
  shortText: "short-text",
  singleChoice: "single-choice",
};

const isoFromNow = ({ days = 0, hours = 0, minutes = 0 } = {}) =>
  new Date(
    Date.now() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000 + minutes * 60 * 1000,
  ).toISOString();

const option = (id, label = id) => ({ id, label });

const clone = (value) => JSON.parse(JSON.stringify(value));

const calculateMaxScore = (questions = []) =>
  questions.reduce((total, question) => total + Number(question.points || 0), 0);

const publicUser = ({ id, name, email, role, createdAt, updatedAt, lastLoginAt }) => ({
  id,
  name,
  email,
  role,
  createdAt,
  lastLoginAt,
  updatedAt,
});

const createToken = (userId, prefix = "mock-token") => `${prefix}-${userId}-${randomUUID()}`;

const createSeedStore = () => {
  const teacherId = "TCH-1";
  const examAvailability = {
    "EX-101": { dueAt: isoFromNow({ days: 7 }), opensAt: isoFromNow({ days: -10 }) },
    "EX-202": { dueAt: isoFromNow({ days: 3 }), opensAt: isoFromNow({ days: -1 }) },
    "EX-303": { dueAt: isoFromNow({ hours: 4 }), opensAt: isoFromNow({ days: -2 }) },
  };
  const exams = [
    {
      id: "EX-101",
      title: "Full Stack Foundations",
      description: "Covers HTTP, browser storage, React basics, and API boundaries.",
      durationMinutes: 60,
      subject: "Web Fundamentals",
      difficulty: "Intermediate",
      createdBy: "Dr. Cohen",
      createdAt: "2026-04-01T08:00:00Z",
      questions: [
        {
          id: "Q-101-1",
          type: QUESTION_TYPES.singleChoice,
          prompt: "Which HTTP method is typically used to create a resource?",
          points: 10,
          options: [option("GET"), option("POST"), option("PATCH"), option("DELETE")],
          correctAnswer: "POST",
        },
        {
          id: "Q-101-2",
          type: QUESTION_TYPES.multipleChoice,
          prompt: "Select the browser APIs commonly used for client-side persistence.",
          points: 10,
          options: [
            option("localStorage"),
            option("sessionStorage"),
            option("CSS media queries"),
            option("Array.prototype.map"),
          ],
          correctAnswers: ["localStorage", "sessionStorage"],
        },
        {
          id: "Q-101-3",
          type: QUESTION_TYPES.shortText,
          prompt: "Name one benefit of separating client and server code.",
          points: 15,
          acceptedKeywords: ["responsibility", "maintenance", "separation"],
          sampleAnswer: "Clear responsibilities make the system easier to maintain.",
        },
      ],
    },
    {
      id: "EX-202",
      title: "React State and Effects",
      description: "Assesses component state, props, effects, rendering, and autosave flows.",
      durationMinutes: 45,
      subject: "React",
      difficulty: "Intermediate",
      createdBy: "Prof. Levi",
      createdAt: "2026-04-05T08:00:00Z",
      questions: [
        {
          id: "Q-202-1",
          type: QUESTION_TYPES.singleChoice,
          prompt: "Which hook is commonly used to fetch data after render?",
          points: 10,
          options: [option("useMemo"), option("useEffect"), option("useRef"), option("useCallback")],
          correctAnswer: "useEffect",
        },
      ],
    },
    {
      id: "EX-303",
      title: "Database and API Design",
      description: "Focuses on REST resources, validation, authorization, and persistence.",
      durationMinutes: 75,
      subject: "Backend",
      difficulty: "Advanced",
      createdBy: "Ms. Bar",
      createdAt: "2026-04-08T08:00:00Z",
      questions: [
        {
          id: "Q-303-1",
          type: QUESTION_TYPES.singleChoice,
          prompt: "Which status code usually means a resource was created?",
          points: 10,
          options: [option("200"), option("201"), option("301"), option("500")],
          correctAnswer: "201",
        },
      ],
    },
  ].map((exam) => ({
    archivedAt: null,
    availability: examAvailability[exam.id],
    instructions: "Read each question carefully. Autosave and submission history are enabled.",
    integrityPolicy: "Leaving the exam window may be recorded in the activity log for review.",
    maxAttempts: exam.id === "EX-101" || exam.id === "EX-303" ? 2 : 1,
    ownerTeacherId: teacherId,
    passingGrade: 70,
    publishedAt: exam.createdAt,
    status: EXAM_STATUSES.published,
    updatedAt: exam.createdAt,
    visibilityScope: "assigned",
    ...exam,
  }));

  exams.push({
    id: "EX-DRAFT-1",
    archivedAt: null,
    availability: { dueAt: isoFromNow({ days: 12 }), opensAt: isoFromNow({ days: 5 }) },
    createdAt: isoFromNow({ days: -2 }),
    createdBy: "Dr. Cohen",
    description: "Draft assessment used to verify that students cannot see unpublished exams.",
    difficulty: "Intermediate",
    durationMinutes: 40,
    instructions: "Draft instructions for the upcoming integrated exam.",
    integrityPolicy: "Standard activity logging applies.",
    maxAttempts: 1,
    ownerTeacherId: teacherId,
    passingGrade: 70,
    publishedAt: null,
    questions: [
      {
        id: "Q-DRAFT-1",
        points: 10,
        prompt: "Explain why shared service boundaries matter.",
        type: QUESTION_TYPES.shortText,
      },
    ],
    status: EXAM_STATUSES.draft,
    subject: "Architecture",
    title: "Integration Draft Exam",
    updatedAt: isoFromNow({ hours: -5 }),
    visibilityScope: "assigned",
  });

  const users = [
    {
      id: teacherId,
      name: "Dr. Cohen",
      email: "teacher@example.com",
      password: "teacher123",
      role: "teacher",
      createdAt: "2026-04-01T08:00:00Z",
      updatedAt: "2026-04-01T08:00:00Z",
    },
    {
      id: "STU-12",
      name: "Maya Rosen",
      email: "student@example.com",
      password: "student123",
      role: "student",
      createdAt: "2026-04-02T08:00:00Z",
      updatedAt: "2026-04-02T08:00:00Z",
    },
  ];

  const examAssignments = exams
    .filter((exam) => exam.status === EXAM_STATUSES.published)
    .map((exam) => ({
      id: `ASN-${exam.id}-STU-12`,
      studentId: "STU-12",
      examId: exam.id,
      opensAt: exam.availability.opensAt,
      dueAt: exam.availability.dueAt,
      allowMultipleAttempts: Number(exam.maxAttempts) > 1,
      maxAttempts: Number(exam.maxAttempts),
      instructions: exam.instructions,
      integrityPolicy: exam.integrityPolicy,
    }));

  const fullStackMaxScore = calculateMaxScore(exams[0].questions);

  return {
    examAssignments,
    examAttempts: [
      {
        id: "ATT-101-STU-12-1",
        examId: "EX-101",
        studentId: "STU-12",
        attemptNumber: 1,
        status: ATTEMPT_STATUSES.graded,
        startedAt: isoFromNow({ days: -5, hours: -1 }),
        expiresAt: isoFromNow({ days: -5 }),
        autosavedAt: isoFromNow({ days: -5 }),
        submittedAt: isoFromNow({ days: -5 }),
        submittedBy: "student",
        answers: {
          "Q-101-1": "POST",
          "Q-101-2": ["localStorage", "sessionStorage"],
          "Q-101-3": "Clear responsibilities help maintenance.",
        },
        score: fullStackMaxScore,
        maxScore: fullStackMaxScore,
        resultsVisible: true,
        teacherFeedback: "Strong submission.",
        scoreBreakdown: [],
        activityLog: [],
      },
    ],
    examTemplates: [
      { id: "TPL-QUIZ", description: "Short timed quiz with objective questions.", title: "Quick Quiz" },
      { id: "TPL-FINAL", description: "Mixed question assessment with manual grading.", title: "Final Exam" },
    ],
    exams,
    notifications: [],
    sessions: [],
    studentScores: [
      {
        id: "SC-9001",
        studentId: "STU-12",
        studentName: "Maya Rosen",
        examId: "EX-101",
        score: fullStackMaxScore,
        maxScore: fullStackMaxScore,
        submittedAt: isoFromNow({ days: -5 }),
        answers: [{ questionId: "Q-101-1", answer: "POST", isCorrect: true }],
      },
    ],
    teacherActivity: [],
    users,
  };
};

let db = createSeedStore();

const resetStore = () => {
  const nextDb = createSeedStore();
  Object.keys(db).forEach((key) => {
    delete db[key];
  });
  Object.assign(db, nextDb);
  return db;
};

const replaceStore = (nextDb) => {
  Object.keys(db).forEach((key) => {
    delete db[key];
  });
  Object.assign(db, nextDb);
  return db;
};

module.exports = {
  ATTEMPT_STATUSES,
  EXAM_STATUSES,
  calculateMaxScore,
  clone,
  createSeedStore,
  createToken,
  get db() {
    return db;
  },
  publicUser,
  replaceStore,
  resetStore,
};
