CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY,
  name varchar,
  email varchar UNIQUE NOT NULL,
  password varchar NOT NULL,
  role varchar NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS exams (
  id varchar PRIMARY KEY,
  owner_teacher_id varchar REFERENCES users(id) ON DELETE SET NULL,
  title varchar NOT NULL,
  description text,
  duration_minutes integer,
  subject varchar,
  difficulty varchar,
  created_by varchar,
  passing_grade integer,
  max_attempts integer,
  status varchar NOT NULL DEFAULT 'draft',
  visibility_scope varchar DEFAULT 'assigned',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions text,
  integrity_policy text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  autosaved_at timestamptz
);

CREATE TABLE IF NOT EXISTS exam_assignments (
  id varchar PRIMARY KEY,
  student_id varchar REFERENCES users(id) ON DELETE CASCADE,
  exam_id varchar REFERENCES exams(id) ON DELETE CASCADE,
  opens_at timestamptz,
  due_at timestamptz,
  allow_multiple_attempts boolean DEFAULT false,
  max_attempts integer DEFAULT 1,
  instructions text,
  integrity_policy text,
  UNIQUE (student_id, exam_id)
);

-- Submissions are exam attempts. JSONB preserves the frontend's answer map:
-- { "Q-101-1": "POST", "Q-101-2": ["localStorage"] }.
CREATE TABLE IF NOT EXISTS submissions (
  id varchar PRIMARY KEY,
  exam_id varchar REFERENCES exams(id) ON DELETE CASCADE,
  student_id varchar REFERENCES users(id) ON DELETE CASCADE,
  attempt_number integer DEFAULT 1,
  status varchar NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer,
  max_score integer,
  results_visible boolean DEFAULT false,
  score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  teacher_feedback text DEFAULT '',
  submitted_by varchar,
  started_at timestamptz,
  expires_at timestamptz,
  autosaved_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz,
  grading_draft_saved_at timestamptz
);

CREATE TABLE IF NOT EXISTS student_scores (
  id varchar PRIMARY KEY,
  student_id varchar REFERENCES users(id) ON DELETE CASCADE,
  student_name varchar,
  exam_id varchar REFERENCES exams(id) ON DELETE CASCADE,
  score integer,
  max_score integer,
  submitted_at timestamptz,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS sessions (
  token varchar PRIMARY KEY,
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,
  refresh_token varchar UNIQUE NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY,
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,
  type varchar,
  message text,
  target_id varchar,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS teacher_activity (
  id varchar PRIMARY KEY,
  type varchar,
  message text,
  target_id varchar,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_templates (
  id varchar PRIMARY KEY,
  title varchar NOT NULL,
  description text
);
