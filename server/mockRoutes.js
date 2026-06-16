const express = require("express");
const { randomUUID } = require("crypto");
const {
  ATTEMPT_STATUSES,
  EXAM_STATUSES,
  calculateMaxScore,
  clone,
  createToken,
  db,
  publicUser,
  replaceStore,
  resetStore,
} = require("./mockStore");
const { loadStore, saveStore } = require("./db/storeRepository");

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    replaceStore(await loadStore());
    next();
  } catch (error) {
    next(error);
  }
});

router.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 400) {
      return originalJson(body);
    }

    saveStore(db)
      .then(() => originalJson(body))
      .catch(next);

    return res;
  };

  next();
});

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const normalizeId = (id) => String(id ?? "").trim().toUpperCase();
const nowIso = () => new Date().toISOString();

class HttpError extends Error {
  constructor(message, status = 500, code = "API_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const getBearerToken = (req) => {
  const header = req.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
};

const findSession = (token) => {
  const session = db.sessions.find((item) => item.token === token);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.sessions = db.sessions.filter((item) => item.token !== token);
    return null;
  }

  return session;
};

const requireUser = (req) => {
  const token = getBearerToken(req);
  const session = token ? findSession(token) : null;
  const user = session ? db.users.find((item) => item.id === session.userId) : null;

  if (!user) {
    throw new HttpError("Authentication required.", 401, "AUTH_REQUIRED");
  }

  return user;
};

const requireRole = (req, role) => {
  const user = requireUser(req);

  if (user.role !== role) {
    throw new HttpError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }

  return user;
};

const createSession = (userId) => {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = {
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    refreshToken: createToken(userId, "mock-refresh"),
    token: createToken(userId),
    userId,
  };

  db.sessions.push(session);
  return session;
};

const findExam = (examId) => {
  const exam = db.exams.find((item) => item.id === normalizeId(examId));

  if (!exam) {
    throw new HttpError("Exam was not found.", 404, "EXAM_NOT_FOUND");
  }

  return exam;
};

const sanitizeQuestion = (question) => {
  const copy = { ...question };
  delete copy.acceptedKeywords;
  delete copy.correctAnswer;
  delete copy.correctAnswers;
  delete copy.sampleAnswer;
  return copy;
};

const sanitizeExam = (exam) => ({
  ...exam,
  questions: (exam.questions ?? []).map(sanitizeQuestion),
});

const copyAttemptForClient = (attempt) => ({
  ...attempt,
  activityLog: attempt.activityLog ?? [],
  answers: attempt.answers ?? {},
  score: attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress ? attempt.score : null,
  scoreBreakdown:
    attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress ? attempt.scoreBreakdown ?? [] : [],
  teacherFeedback:
    attempt.resultsVisible || attempt.status === ATTEMPT_STATUSES.inProgress
      ? attempt.teacherFeedback ?? ""
      : "Submitted. Grades and feedback will appear after the teacher publishes results.",
});

const getStudentAttempts = (studentId, examId) =>
  db.examAttempts
    .filter((attempt) => attempt.studentId === studentId && attempt.examId === normalizeId(examId))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

const buildExamCard = (assignment) => {
  const exam = findExam(assignment.examId);
  const attempts = getStudentAttempts(assignment.studentId, assignment.examId);
  const activeAttempt = attempts.find((attempt) => attempt.status === ATTEMPT_STATUSES.inProgress);
  const latestAttempt = attempts.find((attempt) =>
    [ATTEMPT_STATUSES.submitted, ATTEMPT_STATUSES.graded].includes(attempt.status),
  );
  const now = Date.now();
  const upcoming = new Date(assignment.opensAt).getTime() > now;
  const expired = new Date(assignment.dueAt).getTime() < now;
  const remainingAttempts = Math.max(0, Number(assignment.maxAttempts || 1) - attempts.length);
  const status = activeAttempt
    ? "in-progress"
    : latestAttempt?.status === ATTEMPT_STATUSES.graded && latestAttempt.resultsVisible
      ? "graded"
      : latestAttempt
        ? "submitted"
        : expired
          ? "expired"
          : "not-started";

  return {
    assignmentId: assignment.id,
    canContinue: Boolean(activeAttempt),
    canStart: !activeAttempt && !upcoming && !expired && remainingAttempts > 0,
    completed: ["graded", "submitted"].includes(status),
    description: exam.description,
    difficulty: exam.difficulty,
    dueAt: assignment.dueAt,
    durationMinutes: exam.durationMinutes,
    examId: exam.id,
    latestAttemptId: (latestAttempt ?? activeAttempt)?.id ?? null,
    maxAttempts: assignment.maxAttempts,
    opensAt: assignment.opensAt,
    questionCount: exam.questions.length,
    remainingAttempts,
    score:
      latestAttempt?.resultsVisible && latestAttempt?.score != null
        ? { maxScore: latestAttempt.maxScore, score: latestAttempt.score }
        : null,
    status,
    subject: exam.subject,
    title: exam.title,
    upcoming,
  };
};

const paginate = (items, page = 1, pageSize = 10) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const start = (safePage - 1) * safePageSize;
  return { items: items.slice(start, start + safePageSize), page: safePage, pageSize: safePageSize, total: items.length };
};

const gradeAnswers = (exam, answers = {}) =>
  (exam.questions ?? []).map((question) => {
    const answer = answers[question.id];
    let isCorrect = false;

    if (question.correctAnswer !== undefined) {
      isCorrect = answer === question.correctAnswer;
    } else if (question.correctAnswers) {
      isCorrect =
        Array.isArray(answer) &&
        answer.length === question.correctAnswers.length &&
        question.correctAnswers.every((item) => answer.includes(item));
    } else if (question.acceptedKeywords) {
      const value = String(answer ?? "").toLowerCase();
      isCorrect = question.acceptedKeywords.some((keyword) => value.includes(String(keyword).toLowerCase()));
    }

    return {
      answer: answer ?? "",
      feedback: isCorrect ? "Correct answer." : "Needs review.",
      isCorrect,
      maxScore: Number(question.points || 0),
      overridden: false,
      questionId: question.id,
      score: isCorrect ? Number(question.points || 0) : 0,
    };
  });

const attemptToSubmission = (attempt, exam) => {
  const student = db.users.find((user) => user.id === attempt.studentId);
  return {
    id: attempt.id,
    answers: attempt.answers ?? {},
    attemptId: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    gradedAt: attempt.gradedAt ?? null,
    gradingDraftSavedAt: attempt.gradingDraftSavedAt ?? null,
    maxScore: attempt.maxScore,
    overallFeedback: attempt.teacherFeedback ?? "",
    questionGrades: attempt.scoreBreakdown ?? [],
    resultsVisible: Boolean(attempt.resultsVisible),
    score: attempt.score,
    startedAt: attempt.startedAt,
    status:
      attempt.status === ATTEMPT_STATUSES.inProgress
        ? "in-progress"
        : attempt.status === ATTEMPT_STATUSES.graded && attempt.resultsVisible
          ? "published"
          : attempt.status === ATTEMPT_STATUSES.graded
            ? "graded"
            : "submitted",
    studentId: attempt.studentId,
    studentName: student?.name ?? attempt.studentId,
    submittedAt: attempt.submittedAt,
  };
};

router.get("/", (req, res) => {
  res.json({
    name: "ExamApp memory API",
    storage: "memory",
    endpoints: {
      auth: "/api/auth/*",
      config: "/api/config",
      db: "/api/db",
      exams: "/api/exams",
      notifications: "/api/notifications",
      student: "/api/student/*",
      teacher: "/api/teacher/*",
      users: "/api/users",
    },
  });
});

router.get("/config", (req, res) => {
  res.json({
    api: {
      backendMode: "http",
      baseUrl: "/api",
      dataSource: "server-memory",
      version: "v1",
    },
    auth: {
      demoAccounts: [
        { email: "student@example.com", password: "student123", role: "student" },
        { email: "teacher@example.com", password: "teacher123", role: "teacher" },
      ],
    },
    storage: {
      persistent: false,
      type: "memory",
    },
  });
});

router.get("/db", (req, res) => res.json(clone(db)));
router.post("/db/reset", (req, res) => res.json(clone(resetStore())));

router.get("/users", (req, res) => {
  requireRole(req, "teacher");
  res.json(db.users.map(publicUser));
});
router.post("/users", (req, res) => {
  requireRole(req, "teacher");
  const { email, name, password, role } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role ?? "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !["student", "teacher"].includes(normalizedRole)) {
    throw new HttpError("Name, email, password, and role are required.", 400, "VALIDATION_ERROR");
  }

  if (db.users.some((user) => user.email === normalizedEmail)) {
    throw new HttpError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  const now = nowIso();
  const user = {
    id: `${normalizedRole === "teacher" ? "TCH" : "STU"}-${Date.now()}`,
    createdAt: now,
    email: normalizedEmail,
    name: String(name).trim(),
    password,
    role: normalizedRole,
    updatedAt: now,
  };

  db.users.push(user);
  res.status(201).json(publicUser(user));
});
router.get("/users/:userId", (req, res) => {
  requireRole(req, "teacher");
  const user = db.users.find((item) => item.id === req.params.userId);

  if (!user) {
    throw new HttpError("User was not found.", 404, "USER_NOT_FOUND");
  }

  res.json(publicUser(user));
});
router.put("/users/:userId", (req, res) => {
  requireRole(req, "teacher");
  const user = db.users.find((item) => item.id === req.params.userId);

  if (!user) {
    throw new HttpError("User was not found.", 404, "USER_NOT_FOUND");
  }

  Object.assign(user, {
    email: req.body?.email ? normalizeEmail(req.body.email) : user.email,
    name: req.body?.name ?? user.name,
    password: req.body?.password ?? user.password,
    role: req.body?.role ?? user.role,
    updatedAt: nowIso(),
  });
  res.json(publicUser(user));
});
router.delete("/users/:userId", (req, res) => {
  requireRole(req, "teacher");
  const user = db.users.find((item) => item.id === req.params.userId);

  if (!user) {
    throw new HttpError("User was not found.", 404, "USER_NOT_FOUND");
  }

  db.users = db.users.filter((item) => item.id !== user.id);
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
  db.examAssignments = db.examAssignments.filter((assignment) => assignment.studentId !== user.id);
  db.examAttempts = db.examAttempts.filter((attempt) => attempt.studentId !== user.id);
  db.studentScores = db.studentScores.filter((score) => score.studentId !== user.id);
  res.json({ success: true });
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.users.find((item) => item.email === normalizeEmail(email));

  if (!user || user.password !== password) {
    throw new HttpError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  user.lastLoginAt = nowIso();
  user.updatedAt = user.lastLoginAt;
  const session = createSession(user.id);
  res.json({ expiresAt: session.expiresAt, refreshToken: session.refreshToken, token: session.token, user: publicUser(user) });
});

router.post("/auth/signup", (req, res) => {
  const { email, name, password, role } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role ?? "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !["student", "teacher"].includes(normalizedRole)) {
    throw new HttpError("Name, email, password, and role are required.", 400, "VALIDATION_ERROR");
  }

  if (db.users.some((user) => user.email === normalizedEmail)) {
    throw new HttpError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  const now = nowIso();
  const user = {
    id: `${normalizedRole === "teacher" ? "TCH" : "STU"}-${Date.now()}`,
    createdAt: now,
    email: normalizedEmail,
    lastLoginAt: now,
    name: String(name).trim(),
    password,
    role: normalizedRole,
    updatedAt: now,
  };
  db.users.push(user);
  const session = createSession(user.id);
  res.json({ expiresAt: session.expiresAt, refreshToken: session.refreshToken, token: session.token, user: publicUser(user) });
});

router.get("/auth/me", (req, res) => res.json(publicUser(requireUser(req))));
router.post("/auth/logout", (req, res) => {
  const token = getBearerToken(req);
  db.sessions = db.sessions.filter((session) => session.token !== token);
  res.json({ success: true });
});
router.post("/auth/refresh", (req, res) => {
  const refreshToken = req.body?.refreshToken;
  const existingSession = db.sessions.find((session) => session.refreshToken === refreshToken);

  if (!existingSession || new Date(existingSession.refreshExpiresAt).getTime() <= Date.now()) {
    throw new HttpError("Refresh session expired. Please sign in again.", 401, "REFRESH_EXPIRED");
  }

  db.sessions = db.sessions.filter((session) => session.refreshToken !== refreshToken);
  const session = createSession(existingSession.userId);
  res.json({ expiresAt: session.expiresAt, refreshToken: session.refreshToken, token: session.token });
});
router.post("/auth/password-reset", (req, res) => res.json({ email: normalizeEmail(req.body?.email), success: true }));

router.get("/exams", (req, res) => res.json(clone(db.exams)));
router.get("/exams/:examId", (req, res) => res.json(clone(findExam(req.params.examId))));
router.post("/exams", (req, res) => {
  const exam = { ...req.body, id: req.body?.id ? normalizeId(req.body.id) : `EX-${Date.now()}` };
  db.exams.push(exam);
  res.status(201).json(clone(exam));
});
router.put("/exams/:examId", (req, res) => {
  const exam = findExam(req.params.examId);
  Object.assign(exam, req.body, { id: exam.id, updatedAt: nowIso() });
  res.json(clone(exam));
});
router.delete("/exams/:examId", (req, res) => {
  const exam = findExam(req.params.examId);
  db.exams = db.exams.filter((item) => item.id !== exam.id);
  db.examAssignments = db.examAssignments.filter((assignment) => assignment.examId !== exam.id);
  db.examAttempts = db.examAttempts.filter((attempt) => attempt.examId !== exam.id);
  db.studentScores = db.studentScores.filter((score) => score.examId !== exam.id);
  res.json({ success: true });
});
router.get("/scores", (req, res) => res.json(clone(db.studentScores)));
router.get("/exams/:examId/scores", (req, res) =>
  res.json(clone(db.studentScores.filter((score) => score.examId === normalizeId(req.params.examId)))),
);

router.get("/student/exams", (req, res) => {
  const student = requireRole(req, "student");
  const cards = db.examAssignments.filter((item) => item.studentId === student.id).map(buildExamCard);
  res.json({
    ...paginate(cards, req.query.page, req.query.pageSize),
    summary: {
      available: cards.filter((card) => card.canStart).length,
      averageScore: null,
      completed: cards.filter((card) => card.completed).length,
      expired: cards.filter((card) => card.status === "expired").length,
      inProgress: cards.filter((card) => card.status === "in-progress").length,
      performanceBySubject: [],
      total: cards.length,
      upcoming: cards.filter((card) => card.upcoming).length,
    },
  });
});

router.get("/student/exams/:examId", (req, res) => {
  const student = requireRole(req, "student");
  const assignment = db.examAssignments.find(
    (item) => item.studentId === student.id && item.examId === normalizeId(req.params.examId),
  );

  if (!assignment) {
    throw new HttpError("This exam is not assigned to the current student.", 404, "ASSIGNMENT_NOT_FOUND");
  }

  const exam = findExam(req.params.examId);
  res.json({
    assignment,
    attempts: getStudentAttempts(student.id, exam.id).map(copyAttemptForClient),
    card: buildExamCard(assignment),
    exam: sanitizeExam(exam),
  });
});

router.post("/student/exams/:examId/attempts", (req, res) => {
  const student = requireRole(req, "student");
  const exam = findExam(req.params.examId);
  const assignment = db.examAssignments.find((item) => item.studentId === student.id && item.examId === exam.id);

  if (!assignment) {
    throw new HttpError("This exam is not assigned to the current student.", 404, "ASSIGNMENT_NOT_FOUND");
  }

  const activeAttempt = getStudentAttempts(student.id, exam.id).find((attempt) => attempt.status === ATTEMPT_STATUSES.inProgress);

  if (activeAttempt) {
    res.json({ assignment, attempt: copyAttemptForClient(activeAttempt), exam: sanitizeExam(exam), resumed: true });
    return;
  }

  const now = new Date();
  const attempt = {
    id: `ATT-${Date.now()}-${randomUUID().slice(0, 8)}`.toUpperCase(),
    activityLog: [{ id: `ACT-${Date.now()}`, createdAt: now.toISOString(), message: "Exam started.", type: "started" }],
    answers: {},
    attemptNumber: getStudentAttempts(student.id, exam.id).length + 1,
    autosavedAt: now.toISOString(),
    examId: exam.id,
    expiresAt: new Date(now.getTime() + Number(exam.durationMinutes || 60) * 60 * 1000).toISOString(),
    maxScore: calculateMaxScore(exam.questions),
    resultsVisible: false,
    score: null,
    scoreBreakdown: [],
    startedAt: now.toISOString(),
    status: ATTEMPT_STATUSES.inProgress,
    studentId: student.id,
    submittedAt: null,
    submittedBy: null,
    teacherFeedback: "",
  };
  db.examAttempts.push(attempt);
  res.status(201).json({ assignment, attempt: copyAttemptForClient(attempt), exam: sanitizeExam(exam), resumed: false });
});

router.get("/student/attempts/:attemptId", (req, res) => {
  const student = requireRole(req, "student");
  const attempt = db.examAttempts.find((item) => item.id === req.params.attemptId && item.studentId === student.id);

  if (!attempt) {
    throw new HttpError("Exam attempt was not found.", 404, "ATTEMPT_NOT_FOUND");
  }

  const assignment = db.examAssignments.find((item) => item.studentId === student.id && item.examId === attempt.examId);
  const exam = findExam(attempt.examId);
  res.json({ assignment, attempt: copyAttemptForClient(attempt), exam: sanitizeExam(exam) });
});

router.put("/student/attempts/:attemptId/draft", (req, res) => {
  const student = requireRole(req, "student");
  const attempt = db.examAttempts.find((item) => item.id === req.params.attemptId && item.studentId === student.id);

  if (!attempt) {
    throw new HttpError("Exam attempt was not found.", 404, "ATTEMPT_NOT_FOUND");
  }

  attempt.answers = req.body?.answers ?? {};
  attempt.autosavedAt = nowIso();
  res.json(copyAttemptForClient(attempt));
});

router.post("/student/attempts/:attemptId/submit", (req, res) => {
  const student = requireRole(req, "student");
  const attempt = db.examAttempts.find((item) => item.id === req.params.attemptId && item.studentId === student.id);

  if (!attempt) {
    throw new HttpError("Exam attempt was not found.", 404, "ATTEMPT_NOT_FOUND");
  }

  const exam = findExam(attempt.examId);
  attempt.answers = req.body?.answers ?? attempt.answers ?? {};
  attempt.scoreBreakdown = gradeAnswers(exam, attempt.answers);
  attempt.score = attempt.scoreBreakdown.reduce((total, item) => total + Number(item.score || 0), 0);
  attempt.maxScore = calculateMaxScore(exam.questions);
  attempt.status = ATTEMPT_STATUSES.submitted;
  attempt.submittedAt = nowIso();
  attempt.submittedBy = req.body?.submittedBy ?? "student";
  attempt.resultsVisible = false;
  res.json({ attempt: copyAttemptForClient(attempt), exam: sanitizeExam(exam) });
});

router.get("/student/attempts/:attemptId/result", (req, res) => {
  const student = requireRole(req, "student");
  const attempt = db.examAttempts.find((item) => item.id === req.params.attemptId && item.studentId === student.id);

  if (!attempt) {
    throw new HttpError("Exam attempt was not found.", 404, "ATTEMPT_NOT_FOUND");
  }

  const assignment = db.examAssignments.find((item) => item.studentId === student.id && item.examId === attempt.examId);
  const exam = findExam(attempt.examId);
  res.json({ assignment, attempt: copyAttemptForClient(attempt), exam, history: getStudentAttempts(student.id, attempt.examId).map(copyAttemptForClient) });
});
router.get("/student/activity", (req, res) => {
  const student = requireRole(req, "student");
  res.json(
    db.examAttempts
      .filter((attempt) => attempt.studentId === student.id)
      .flatMap((attempt) => (attempt.activityLog ?? []).map((activity) => ({ ...activity, attemptId: attempt.id, examId: attempt.examId }))),
  );
});
router.post("/student/attempts/:attemptId/activity", (req, res) => {
  const student = requireRole(req, "student");
  const attempt = db.examAttempts.find((item) => item.id === req.params.attemptId && item.studentId === student.id);

  if (!attempt) {
    throw new HttpError("Exam attempt was not found.", 404, "ATTEMPT_NOT_FOUND");
  }

  attempt.activityLog = attempt.activityLog ?? [];
  attempt.activityLog.push({ id: `ACT-${Date.now()}`, createdAt: nowIso(), message: req.body?.message ?? "", type: req.body?.type ?? "activity" });
  res.json(copyAttemptForClient(attempt));
});

router.get("/teacher/dashboard", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exams = db.exams.filter((exam) => exam.ownerTeacherId === teacher.id);
  const submissions = db.examAttempts
    .filter((attempt) => exams.some((exam) => exam.id === attempt.examId))
    .map((attempt) => attemptToSubmission(attempt, findExam(attempt.examId)));

  res.json({
    activity: db.teacherActivity.slice(0, 8),
    exams: exams.map((exam) => ({ ...exam, maxScore: calculateMaxScore(exam.questions), submissionsCount: submissions.filter((item) => item.examId === exam.id).length })),
    recentlyGraded: submissions.filter((submission) => ["graded", "published"].includes(submission.status)).slice(0, 5),
    stats: {
      activeSubmissions: submissions.filter((submission) => submission.status === "in-progress").length,
      archivedExams: exams.filter((exam) => exam.status === EXAM_STATUSES.archived).length,
      draftExams: exams.filter((exam) => exam.status === EXAM_STATUSES.draft).length,
      pendingGrading: submissions.filter((submission) => submission.status === "submitted").length,
      publishedExams: exams.filter((exam) => exam.status === EXAM_STATUSES.published).length,
      totalExams: exams.length,
      totalSubmissions: submissions.length,
    },
    templates: db.examTemplates,
  });
});

router.get("/teacher/exams", (req, res) => {
  const teacher = requireRole(req, "teacher");
  res.json(paginate(db.exams.filter((exam) => exam.ownerTeacherId === teacher.id), req.query.page, req.query.pageSize));
});
router.post("/teacher/exams", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const now = nowIso();
  const exam = {
    archivedAt: null,
    availability: req.body?.availability ?? { dueAt: "", opensAt: "" },
    createdAt: now,
    createdBy: teacher.name,
    description: req.body?.description ?? "",
    difficulty: req.body?.difficulty ?? "Foundational",
    durationMinutes: Number(req.body?.durationMinutes ?? 60),
    id: `EX-${Date.now()}`,
    instructions: req.body?.instructions ?? "",
    integrityPolicy: req.body?.integrityPolicy ?? "",
    maxAttempts: Number(req.body?.maxAttempts ?? 1),
    ownerTeacherId: teacher.id,
    passingGrade: Number(req.body?.passingGrade ?? 70),
    publishedAt: null,
    questions: req.body?.questions ?? [],
    status: EXAM_STATUSES.draft,
    subject: req.body?.subject ?? "Teacher Managed",
    title: req.body?.title ?? "Untitled Exam",
    updatedAt: now,
    visibilityScope: "assigned",
  };
  db.exams.unshift(exam);
  res.status(201).json(exam);
});
router.get("/teacher/exams/:examId", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exam = findExam(req.params.examId);

  if (exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Teacher exam was not found.", 404, "TEACHER_EXAM_NOT_FOUND");
  }

  res.json({ ...exam, maxScore: calculateMaxScore(exam.questions) });
});
router.put("/teacher/exams/:examId", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exam = findExam(req.params.examId);

  if (exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Teacher exam was not found.", 404, "TEACHER_EXAM_NOT_FOUND");
  }

  Object.assign(exam, req.body, { id: exam.id, ownerTeacherId: teacher.id, updatedAt: nowIso() });
  res.json(exam);
});
router.put("/teacher/exams/:examId/draft", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exam = findExam(req.params.examId);

  if (exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Teacher exam was not found.", 404, "TEACHER_EXAM_NOT_FOUND");
  }

  Object.assign(exam, req.body, { autosavedAt: nowIso(), id: exam.id, ownerTeacherId: teacher.id, updatedAt: nowIso() });
  res.json(exam);
});
router.delete("/teacher/exams/:examId", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exam = findExam(req.params.examId);

  if (exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Teacher exam was not found.", 404, "TEACHER_EXAM_NOT_FOUND");
  }

  db.exams = db.exams.filter((item) => item.id !== exam.id);
  res.json({ success: true });
});
router.post("/teacher/exams/:examId/duplicate", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exam = findExam(req.params.examId);
  const copy = clone(exam);
  copy.id = `EX-${Date.now()}`;
  copy.title = `${exam.title} Copy`;
  copy.status = EXAM_STATUSES.draft;
  copy.publishedAt = null;
  copy.ownerTeacherId = teacher.id;
  db.exams.unshift(copy);
  res.status(201).json(copy);
});
["publish", "unpublish", "archive"].forEach((action) => {
  router.post(`/teacher/exams/:examId/${action}`, (req, res) => {
    const teacher = requireRole(req, "teacher");
    const exam = findExam(req.params.examId);

    if (exam.ownerTeacherId !== teacher.id) {
      throw new HttpError("Teacher exam was not found.", 404, "TEACHER_EXAM_NOT_FOUND");
    }

    exam.status = action === "publish" ? EXAM_STATUSES.published : action === "archive" ? EXAM_STATUSES.archived : EXAM_STATUSES.draft;
    exam.publishedAt = action === "publish" ? exam.publishedAt ?? nowIso() : null;
    exam.archivedAt = action === "archive" ? nowIso() : null;
    exam.updatedAt = nowIso();
    res.json(exam);
  });
});

router.get("/teacher/submissions", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const exams = db.exams.filter((exam) => exam.ownerTeacherId === teacher.id);
  const submissions = db.examAttempts
    .filter((attempt) => exams.some((exam) => exam.id === attempt.examId))
    .map((attempt) => attemptToSubmission(attempt, findExam(attempt.examId)));
  res.json(paginate(submissions, req.query.page, req.query.pageSize));
});
router.get("/teacher/submissions/:submissionId", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const attempt = db.examAttempts.find((item) => item.id === req.params.submissionId);
  const exam = attempt ? findExam(attempt.examId) : null;

  if (!attempt || exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Submission was not found.", 404, "TEACHER_SUBMISSION_NOT_FOUND");
  }

  res.json({ exam, nextSubmissionId: null, previousSubmissionId: null, submission: attemptToSubmission(attempt, exam) });
});
router.put("/teacher/submissions/:submissionId/grades", (req, res) => {
  const teacher = requireRole(req, "teacher");
  const attempt = db.examAttempts.find((item) => item.id === req.params.submissionId);
  const exam = attempt ? findExam(attempt.examId) : null;

  if (!attempt || exam.ownerTeacherId !== teacher.id) {
    throw new HttpError("Submission was not found.", 404, "TEACHER_SUBMISSION_NOT_FOUND");
  }

  attempt.scoreBreakdown = req.body?.questionGrades ?? attempt.scoreBreakdown;
  attempt.teacherFeedback = req.body?.overallFeedback ?? attempt.teacherFeedback;
  attempt.gradingDraftSavedAt = nowIso();
  res.json(attemptToSubmission(attempt, exam));
});
["complete", "publish", "hide"].forEach((action) => {
  router.post(`/teacher/submissions/:submissionId/${action}`, (req, res) => {
    const teacher = requireRole(req, "teacher");
    const attempt = db.examAttempts.find((item) => item.id === req.params.submissionId);
    const exam = attempt ? findExam(attempt.examId) : null;

    if (!attempt || exam.ownerTeacherId !== teacher.id) {
      throw new HttpError("Submission was not found.", 404, "TEACHER_SUBMISSION_NOT_FOUND");
    }

    attempt.scoreBreakdown = req.body?.questionGrades ?? attempt.scoreBreakdown;
    attempt.teacherFeedback = req.body?.overallFeedback ?? attempt.teacherFeedback;
    attempt.status = ATTEMPT_STATUSES.graded;
    attempt.resultsVisible = action === "publish";
    attempt.gradedAt = nowIso();
    res.json(attemptToSubmission(attempt, exam));
  });
});

router.get("/notifications", (req, res) => {
  const user = requireUser(req);
  const notifications = db.notifications.filter((item) => item.userId === user.id);
  res.json({ items: notifications.slice(0, 12), unreadCount: notifications.filter((item) => !item.readAt).length });
});
router.post("/notifications/read", (req, res) => {
  const user = requireUser(req);
  db.notifications.forEach((item) => {
    if (item.userId === user.id && !item.readAt) {
      item.readAt = nowIso();
    }
  });
  res.json({ success: true });
});

router.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(error.status || 500).json({
    code: error.code || "API_ERROR",
    details: error.details ?? null,
    message: error.message || "Unexpected server error.",
  });
});

module.exports = router;
