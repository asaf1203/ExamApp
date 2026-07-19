# ExamApp Architecture

[Back to main README](../README.md)

## High-level architecture

ExamApp is a three-tier application:

- **Client:** React 19 SPA built with Vite and served by Nginx.
- **Server:** Express 5 REST API running on Node.js 22.
- **Database:** PostgreSQL 16.
- **Services:** client-side service facades, authentication, exam workflows,
  grading, notifications, configuration, and persistence mapping.

```mermaid
flowchart LR
    Browser["Browser"]

    subgraph Client["Client container"]
        Nginx["Nginx<br/>static files + /api proxy"]
        React["React SPA"]
        Facades["Service facades"]
    end

    subgraph Server["Server container"]
        Express["Express application"]
        Routes["REST routes + authorization"]
        Memory["camelCase domain store"]
        Repository["Store repository"]
    end

    subgraph Database["Database container"]
        Postgres[("PostgreSQL")]
    end

    Browser --> Nginx
    Nginx --> React
    React --> Facades
    Facades -->|"HTTP /api + Bearer token"| Nginx
    Nginx -->|"server:3000"| Express
    Express --> Routes
    Routes --> Memory
    Memory <--> Repository
    Repository <--> Postgres
```

## Component interaction and data flow

1. The browser loads the React bundle from Nginx.
2. React pages call service facades instead of storage directly.
3. In HTTP mode, `apiClient` sends JSON requests to `/api` and attaches the
   current bearer token.
4. Nginx proxies `/api/*` to the Express service using Docker DNS name `server`.
5. Express loads PostgreSQL data into the domain store, authenticates the user,
   enforces role and ownership rules, and executes the requested operation.
6. Successful mutations are persisted through `storeRepository`.
7. Responses are mapped to camelCase JSON consumed by the client.

## Storage responsibilities

- Users and roles: `users`
- Access and refresh sessions: `sessions`
- Exam definitions and nested questions: `exams`
- Student-to-exam access: `exam_assignments`
- Attempts, answers, grades, and activity: `submissions`
- Reporting score records: `student_scores`
- User messages: `notifications`
- Teacher dashboard feed and templates: `teacher_activity`, `exam_templates`
- Development mock mode: browser storage through `client/src/api/mockDb.js`

## Client architecture

### Packages

Runtime:

- `react`, `react-dom`
- `bootstrap`

Development:

- `vite`, `@vitejs/plugin-react`
- `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`
- `eslint` and React ESLint plugins

### Pattern

The client uses a **feature-sliced component architecture** with a
**service/repository facade**:

- React pages/components form the presentation layer.
- Context providers and hooks manage shared application behavior.
- Service modules expose stable domain operations.
- `apiClient` centralizes mock/HTTP transport, bearer tokens, caching, retries,
  timeouts, interceptors, and normalized errors.
- Model modules contain domain contracts, constants, factories, and grading
  helpers.

The project uses a custom hash router rather than React Router.

### Component hierarchy

```mermaid
flowchart TD
    Main["main.jsx"] --> App
    App --> ErrorBoundary
    ErrorBoundary --> ThemeProvider
    ThemeProvider --> ToastProvider
    ToastProvider --> RouterProvider
    RouterProvider --> AuthProvider
    AuthProvider --> AuthenticatedApp
    AuthenticatedApp -->|"not signed in"| AuthScreen
    AuthenticatedApp -->|"signed in"| AppLayout
    AppLayout --> RouteSwitch
    RouteSwitch --> StudentPages["Student pages"]
    RouteSwitch --> TeacherPages["Teacher pages"]
    RouteSwitch --> SharedPages["Profile / Unauthorized / Not Found"]
    StudentPages --> StudentComponents["QuestionRenderer / shared controls"]
    TeacherPages --> TeacherComponents["QuestionEditor / ExamTable / badges"]
```

### Important directories

```text
client/src/
├── api/                    # HTTP/mock transport and service facades
├── auth/                   # Authentication context and UI
├── components/             # Shared components
├── config/                 # Environment, validation, defaults, feature flags
├── features/
│   ├── student-exams/      # Student pages and question rendering
│   └── teacher-exams/      # Teacher pages, editor, grading
├── hooks/                  # Countdown, debounce, unload, flags
├── layout/                 # Authenticated application shell
├── models/                 # Domain contracts and helpers
├── pages/                  # Shared pages
├── routing/                # Custom hash router
├── ui/                     # Theme, toast, and error boundary
├── App.jsx
└── main.jsx
```

## Server architecture

### Packages

Runtime:

- `express` — HTTP server and routing
- `pg` — PostgreSQL pool and queries
- `dotenv` — local environment loading

Development:

- `supertest` — API integration tests

### Pattern

The server is a **layered REST application with a snapshot repository**:

- `server.js` — process entry point.
- `server/createApp.js` — CORS, JSON parsing, routes, health checks, optional
  static client hosting.
- `server/mockRoutes.js` — controllers, authorization, and domain workflows.
- `server/mockStore.js` — seed objects and mutable domain store.
- `server/db/storeRepository.js` — PostgreSQL mapping and persistence.
- `server/db/connect.js` — database connection pool.
- `server/db/schema.sql` — relational schema.

In PostgreSQL mode, routes load relational rows into camelCase domain objects.
Successful mutations save the domain store in a transaction. The current
repository deletes and reinserts the complete snapshot; targeted SQL operations
would be preferable for high concurrency and large datasets.

## Authentication and authorization

- Login creates opaque access and refresh tokens in `sessions`.
- The client sends `Authorization: Bearer <token>`.
- `requireUser` validates the session.
- `requireRole` enforces `student` or `teacher`.
- Student resources are scoped to the authenticated student.
- Teacher exams/submissions are scoped to the owning teacher.
- Correct answers are removed from student exam-taking responses.
- Scores and feedback remain hidden until the teacher publishes results.

## Object-oriented domain design

The implementation mainly uses JavaScript objects and modules rather than
runtime classes. This UML describes the logical domain model.

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +Role role
    }
    class Session {
        +String token
        +String refreshToken
        +Date expiresAt
        +isExpired() Boolean
    }
    class Exam {
        +String id
        +String ownerTeacherId
        +String title
        +ExamStatus status
        +Number durationMinutes
        +Question[] questions
        +publish()
        +archive()
        +duplicate()
    }
    class Question {
        +String id
        +QuestionType type
        +String prompt
        +Number points
        +Option[] options
        +grade(answer) QuestionGrade
    }
    class ExamAssignment {
        +String studentId
        +String examId
        +Date opensAt
        +Date dueAt
        +Number maxAttempts
    }
    class Submission {
        +String id
        +String examId
        +String studentId
        +SubmissionStatus status
        +Map answers
        +Number score
        +Boolean resultsVisible
        +saveDraft()
        +submit()
        +publishResults()
    }
    class Notification {
        +String id
        +String userId
        +String message
        +Date readAt
        +markRead()
    }
    class ApiClient {
        +request(path, options)
        +get(path)
        +post(path, body)
        +put(path, body)
        +delete(path)
    }
    class StoreRepository {
        +loadStore()
        +saveStore(store)
    }

    User "1" --> "*" Session
    User "1" --> "*" Exam : teacher owns
    User "1" --> "*" ExamAssignment : student receives
    Exam "1" *-- "*" Question
    Exam "1" --> "*" ExamAssignment
    User "1" --> "*" Submission : student submits
    Exam "1" --> "*" Submission
    User "1" --> "*" Notification
    ApiClient ..> Exam
    StoreRepository ..> User
    StoreRepository ..> Exam
    StoreRepository ..> Submission
```

## Key sequence diagrams

### Sign in

```mermaid
sequenceDiagram
    actor User
    participant UI as AuthScreen
    participant Auth as authService
    participant API as apiClient
    participant Server as Express Auth API
    participant Repo as storeRepository
    participant DB as PostgreSQL

    User->>UI: Submit credentials
    UI->>Auth: login(credentials)
    Auth->>API: POST /api/auth/login
    API->>Server: JSON credentials
    Server->>Repo: loadStore()
    Repo->>DB: Load users and sessions
    Server->>Server: Verify credentials and create session
    Server->>Repo: saveStore(updated store)
    Repo->>DB: Transactional persistence
    Server-->>Auth: Tokens and public user
    Auth->>Auth: Store tokens
    UI-->>User: Open role dashboard
```

### Student submits an exam

```mermaid
sequenceDiagram
    actor Student
    participant Page as ExamTakingPage
    participant Service as examService
    participant Server as Student API
    participant DB as PostgreSQL

    Student->>Page: Start assigned exam
    Page->>Service: startOrResumeExam(examId)
    Service->>Server: POST /student/exams/:id/attempts
    Server->>Server: Check role and assignment
    Server->>DB: Persist attempt
    Server-->>Page: Sanitized exam and attempt

    loop During exam
        Student->>Page: Answer question
        Page->>Service: saveAttemptDraft()
        Service->>Server: PUT /student/attempts/:id/draft
        Server->>DB: Persist answers
    end

    Student->>Page: Submit
    Service->>Server: POST /student/attempts/:id/submit
    Server->>Server: Grade supported answers
    Server->>DB: Save submission and notification
    Server-->>Page: Submitted attempt
```

### Teacher grades and publishes

```mermaid
sequenceDiagram
    actor Teacher
    participant Page as SubmissionReviewPage
    participant Service as teacherService
    participant Server as Teacher API
    participant DB as PostgreSQL
    participant Student as Student client

    Teacher->>Page: Open submission
    Page->>Service: getTeacherSubmission(id)
    Service->>Server: GET /teacher/submissions/:id
    Server->>Server: Check role and ownership
    Server->>DB: Load submission and exam
    Server-->>Page: Review data
    Teacher->>Page: Adjust grades and feedback
    Service->>Server: PUT /teacher/submissions/:id/grades
    Server->>DB: Save grading draft
    Teacher->>Page: Publish
    Service->>Server: POST /teacher/submissions/:id/publish
    Server->>DB: Show result and create notification
    Student->>Server: GET /student/attempts/:id/result
    Server-->>Student: Score and feedback
```
