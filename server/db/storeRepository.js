const { pool } = require("./connect");

const iso = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const json = (value, fallback) => value ?? fallback;

const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  role: row.role,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
  lastLoginAt: iso(row.last_login_at),
});

const mapExam = (row) => ({
  id: row.id,
  archivedAt: iso(row.archived_at),
  autosavedAt: iso(row.autosaved_at),
  availability: json(row.availability, {}),
  createdAt: iso(row.created_at),
  createdBy: row.created_by,
  description: row.description ?? "",
  difficulty: row.difficulty ?? "Foundational",
  durationMinutes: Number(row.duration_minutes ?? 60),
  instructions: row.instructions ?? "",
  integrityPolicy: row.integrity_policy ?? "",
  maxAttempts: Number(row.max_attempts ?? 1),
  ownerTeacherId: row.owner_teacher_id,
  passingGrade: Number(row.passing_grade ?? 70),
  publishedAt: iso(row.published_at),
  questions: json(row.questions, []),
  status: row.status,
  subject: row.subject ?? "General",
  title: row.title,
  updatedAt: iso(row.updated_at),
  visibilityScope: row.visibility_scope ?? "assigned",
});

const mapAssignment = (row) => ({
  id: row.id,
  studentId: row.student_id,
  examId: row.exam_id,
  opensAt: iso(row.opens_at),
  dueAt: iso(row.due_at),
  allowMultipleAttempts: Boolean(row.allow_multiple_attempts),
  maxAttempts: Number(row.max_attempts ?? 1),
  instructions: row.instructions ?? "",
  integrityPolicy: row.integrity_policy ?? "",
});

const mapSubmission = (row) => ({
  id: row.id,
  examId: row.exam_id,
  studentId: row.student_id,
  attemptNumber: Number(row.attempt_number ?? 1),
  status: row.status,
  startedAt: iso(row.started_at),
  expiresAt: iso(row.expires_at),
  autosavedAt: iso(row.autosaved_at),
  submittedAt: iso(row.submitted_at),
  submittedBy: row.submitted_by,
  answers: json(row.answers, {}),
  score: row.score,
  maxScore: row.max_score,
  resultsVisible: Boolean(row.results_visible),
  teacherFeedback: row.teacher_feedback ?? "",
  scoreBreakdown: json(row.score_breakdown, []),
  activityLog: json(row.activity_log, []),
  gradedAt: iso(row.graded_at),
  gradingDraftSavedAt: iso(row.grading_draft_saved_at),
});

const loadStore = async () => {
  const client = await pool.connect();

  try {
    const [
      users,
      exams,
      assignments,
      submissions,
      scores,
      sessions,
      notifications,
      activity,
      templates,
    ] = await Promise.all([
      client.query("SELECT * FROM users ORDER BY created_at, id"),
      client.query("SELECT * FROM exams ORDER BY updated_at DESC, id"),
      client.query("SELECT * FROM exam_assignments ORDER BY due_at, id"),
      client.query("SELECT * FROM submissions ORDER BY started_at DESC NULLS LAST, id"),
      client.query("SELECT * FROM student_scores ORDER BY submitted_at DESC NULLS LAST, id"),
      client.query("SELECT * FROM sessions"),
      client.query("SELECT * FROM notifications ORDER BY created_at DESC, id"),
      client.query("SELECT * FROM teacher_activity ORDER BY created_at DESC, id"),
      client.query("SELECT * FROM exam_templates ORDER BY title, id"),
    ]);

    return {
      examAssignments: assignments.rows.map(mapAssignment),
      examAttempts: submissions.rows.map(mapSubmission),
      examTemplates: templates.rows.map((row) => ({
        id: row.id,
        description: row.description ?? "",
        title: row.title,
      })),
      exams: exams.rows.map(mapExam),
      notifications: notifications.rows.map((row) => ({
        id: row.id,
        createdAt: iso(row.created_at),
        message: row.message ?? "",
        readAt: iso(row.read_at),
        targetId: row.target_id,
        type: row.type,
        userId: row.user_id,
      })),
      sessions: sessions.rows.map((row) => ({
        expiresAt: iso(row.expires_at),
        issuedAt: iso(row.issued_at),
        refreshExpiresAt: iso(row.refresh_expires_at),
        refreshToken: row.refresh_token,
        token: row.token,
        userId: row.user_id,
      })),
      studentScores: scores.rows.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        examId: row.exam_id,
        score: row.score,
        maxScore: row.max_score,
        submittedAt: iso(row.submitted_at),
        answers: json(row.answers, []),
      })),
      teacherActivity: activity.rows.map((row) => ({
        id: row.id,
        createdAt: iso(row.created_at),
        message: row.message ?? "",
        targetId: row.target_id,
        type: row.type,
      })),
      users: users.rows.map(mapUser),
    };
  } finally {
    client.release();
  }
};

const insertRows = async (client, store) => {
  for (const user of store.users ?? []) {
    await client.query(
      `INSERT INTO users
        (id, name, email, password, role, created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.createdAt,
        user.updatedAt,
        user.lastLoginAt,
      ],
    );
  }

  for (const exam of store.exams ?? []) {
    await client.query(
      `INSERT INTO exams
        (id, owner_teacher_id, title, description, duration_minutes, subject,
         difficulty, created_by, passing_grade, max_attempts, status,
         visibility_scope, published_at, archived_at, created_at, updated_at,
         availability, instructions, integrity_policy, questions, autosaved_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17::jsonb, $18, $19, $20::jsonb, $21)`,
      [
        exam.id,
        exam.ownerTeacherId,
        exam.title,
        exam.description,
        exam.durationMinutes,
        exam.subject,
        exam.difficulty,
        exam.createdBy,
        exam.passingGrade,
        exam.maxAttempts,
        exam.status,
        exam.visibilityScope,
        exam.publishedAt,
        exam.archivedAt,
        exam.createdAt,
        exam.updatedAt,
        JSON.stringify(exam.availability ?? {}),
        exam.instructions,
        exam.integrityPolicy,
        JSON.stringify(exam.questions ?? []),
        exam.autosavedAt,
      ],
    );
  }

  for (const assignment of store.examAssignments ?? []) {
    await client.query(
      `INSERT INTO exam_assignments
        (id, student_id, exam_id, opens_at, due_at, allow_multiple_attempts,
         max_attempts, instructions, integrity_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        assignment.id,
        assignment.studentId,
        assignment.examId,
        assignment.opensAt,
        assignment.dueAt,
        assignment.allowMultipleAttempts,
        assignment.maxAttempts,
        assignment.instructions,
        assignment.integrityPolicy,
      ],
    );
  }

  for (const attempt of store.examAttempts ?? []) {
    await client.query(
      `INSERT INTO submissions
        (id, exam_id, student_id, attempt_number, status, answers, score,
         max_score, results_visible, score_breakdown, activity_log,
         teacher_feedback, submitted_by, started_at, expires_at, autosaved_at,
         submitted_at, graded_at, grading_draft_saved_at)
       VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb,
         $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        attempt.id,
        attempt.examId,
        attempt.studentId,
        attempt.attemptNumber,
        attempt.status,
        JSON.stringify(attempt.answers ?? {}),
        attempt.score,
        attempt.maxScore,
        Boolean(attempt.resultsVisible),
        JSON.stringify(attempt.scoreBreakdown ?? []),
        JSON.stringify(attempt.activityLog ?? []),
        attempt.teacherFeedback,
        attempt.submittedBy,
        attempt.startedAt,
        attempt.expiresAt,
        attempt.autosavedAt,
        attempt.submittedAt,
        attempt.gradedAt,
        attempt.gradingDraftSavedAt,
      ],
    );
  }

  for (const score of store.studentScores ?? []) {
    await client.query(
      `INSERT INTO student_scores
        (id, student_id, student_name, exam_id, score, max_score, submitted_at, answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        score.id,
        score.studentId,
        score.studentName,
        score.examId,
        score.score,
        score.maxScore,
        score.submittedAt,
        JSON.stringify(score.answers ?? []),
      ],
    );
  }

  for (const session of store.sessions ?? []) {
    await client.query(
      `INSERT INTO sessions
        (token, user_id, refresh_token, issued_at, expires_at, refresh_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.token,
        session.userId,
        session.refreshToken,
        session.issuedAt,
        session.expiresAt,
        session.refreshExpiresAt,
      ],
    );
  }

  for (const notification of store.notifications ?? []) {
    await client.query(
      `INSERT INTO notifications
        (id, user_id, type, message, target_id, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.message,
        notification.targetId,
        notification.createdAt,
        notification.readAt,
      ],
    );
  }

  for (const item of store.teacherActivity ?? []) {
    await client.query(
      `INSERT INTO teacher_activity (id, type, message, target_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.id, item.type, item.message, item.targetId, item.createdAt],
    );
  }

  for (const template of store.examTemplates ?? []) {
    await client.query(
      "INSERT INTO exam_templates (id, title, description) VALUES ($1, $2, $3)",
      [template.id, template.title, template.description],
    );
  }
};

const saveStore = async (store) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM sessions;
       DELETE FROM notifications;
       DELETE FROM teacher_activity;
       DELETE FROM student_scores;
       DELETE FROM submissions;
       DELETE FROM exam_assignments;
       DELETE FROM exam_templates;
       DELETE FROM exams;
       DELETE FROM users;`,
    );
    await insertRows(client, store);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  loadStore,
  saveStore,
};
