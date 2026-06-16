# ExamApp

React + Express exams app with a PostgreSQL-backed API compatibility layer.

The frontend was originally built against nested mock objects. The backend API
keeps those same camelCase object shapes, including nested `exam.questions` and
submission `answers`, while PostgreSQL stores the durable data.

## Features Covered

- Student login and teacher login
- Student exam listing, exam details, taking an exam, autosave, submit, results
- Teacher dashboard, exam CRUD, publish/unpublish/archive, duplicate, preview
- Teacher submission listing, grading drafts, publishing and hiding results
- Notifications

## Install

Install root server dependencies:

```sh
npm install
```

Install frontend dependencies:

```sh
cd client
npm install
```

## PostgreSQL Setup

Create a local database:

```sh
createdb exam_app
```

Copy `.env.example` to `.env` and adjust the connection string:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5432/exam_app
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Run the schema:

```sh
npm run db:schema
```

Seed from the mock-store reference data:

```sh
npm run db:seed
```

Test the database connection:

```sh
npm run db:test
```

Run the shape compatibility check:

```sh
npm run db:compat
```

## Start Backend

```sh
npm run dev
```

The API runs at `http://localhost:3000/api`.

## Start Frontend Against PostgreSQL API

Create `client/.env.local` from `client/.env.server.example`:

```sh
VITE_API_BACKEND=http
VITE_API_BASE_URL=http://localhost:3000/api
VITE_AUTH_API_URL=http://localhost:3000/api/auth
```

Then start Vite:

```sh
cd client
npm run dev
```

## Demo Accounts

- Teacher: `teacher@example.com` / `teacher123`
- Student: `student@example.com` / `student123`

## Database Tables

- `users`
- `exams`
- `exam_assignments`
- `submissions`
- `student_scores`
- `sessions`
- `notifications`
- `teacher_activity`
- `exam_templates`

`exams.questions` is JSONB so the API can return each exam with the same nested
`questions` array the frontend already expects. `submissions.answers`,
`submissions.score_breakdown`, and `submissions.activity_log` are JSONB for the
same compatibility reason.

## Verifying Mock DB Replacement

Run the app with `VITE_API_BACKEND=http`. In this mode the existing service
facades call Express routes instead of the browser mock database. The mock files
remain as reference/backup data:

- `client/src/api/mockDb.js`
- `server/mockStore.js`

You can confirm runtime API usage in the browser Network tab: frontend requests
should go to `http://localhost:3000/api/...`.
