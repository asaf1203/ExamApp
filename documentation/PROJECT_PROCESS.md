# Project Process and Milestones

[Back to main README](../README.md)

## Repository structure

```text
.
├── .github/workflows/       # CI and Docker Hub publishing
├── client/                  # React/Vite application and tests
├── docs/                    # Committed GitHub Pages static build
├── documentation/           # Submission and architecture documentation
├── scripts/                 # Deployment smoke test
├── server/
│   ├── db/                  # Schema, repository, seed, DB checks
│   ├── tests/               # API authorization tests
│   ├── createApp.js         # Express composition
│   ├── mockRoutes.js        # REST controllers and domain workflows
│   └── mockStore.js         # Domain store and seed data
├── docker-compose.yml
├── server.js
└── package.json
```

## Branching strategy

The project used a feature-branch workflow:

1. Work was implemented in `feature/<topic>` branches.
2. Feature branches were merged by pull request into `dev`.
3. `dev` served as the integration branch.
4. Integrated work was promoted from `dev` to `main` through pull requests.

Examples:

- `feature/login`
- `feature/student-exams-quick-start`
- `feature/teacher-dashboard`
- `feature/configuration-service`
- `feature/student-and-teacher-integration`
- `feature/unittests`
- `feature/database`
- `feature/add-docker-deployment`
- `feature/security-check`
- `feature/deployment-test`
- `feature/dockerhub-push`

This approach isolated features, made pull requests reviewable, and kept
`main` as the stable submission branch.

## Semester milestones

1. Project specification and initial React/Vite setup.
2. GitHub Pages static client deployment.
3. Authentication and role-specific login.
4. Student dashboard and exam-taking flow.
5. Teacher dashboard and exam management.
6. Configuration service, environment modes, and feature flags.
7. Connected teacher/student workflows.
8. Client unit and component tests.
9. Initial Express API and JSON/in-memory store.
10. PostgreSQL schema, seed, mapping, and durable persistence.
11. Teacher question-type management.
12. Production client serving and HTTP API integration.
13. Client/server Dockerfiles and Docker Compose deployment.
14. Gitleaks secret scanning and API authorization CI.
15. Docker Compose build/deployment smoke testing.
16. Daily Docker Hub image publishing.

## Evolution of the architecture

### Stage 1 — frontend prototype

The project began as a React application using a browser-based mock database.
This allowed student and teacher workflows to develop without waiting for a
backend.

### Stage 2 — service boundaries

Client pages were moved behind `authService`, `examService`,
`teacherService`, and other facades. These stable interfaces made it possible
to switch between mock and HTTP transports using configuration.

### Stage 3 — shared workflows

Teacher exam publication, student assignment, attempts, submissions, grading,
and result publication were connected through shared domain objects.

### Stage 4 — Express API

The in-memory domain store was exposed through role-protected REST routes. The
client could then run in `VITE_API_BACKEND=http` mode.

### Stage 5 — PostgreSQL

A relational schema and repository mapper were added. JSONB retained nested
questions, answer maps, score breakdowns, and activity logs while core
relationships became foreign keys.

### Stage 6 — containerization and CI/CD

The client, server, and PostgreSQL database were connected through Docker
Compose. GitHub Actions then added:

- secret scanning
- authorization integration tests
- complete deployment smoke tests
- daily Docker Hub publication

## Development practices

- Environment-specific values are separated from source code.
- Vite exposes only explicitly prefixed public configuration.
- API access is centralized through service facades.
- Authentication is enforced in the server, not only the UI.
- Feature work is developed on topic branches and merged through pull requests.
- Client, server, database, and deployment behavior have separate tests.
- Container healthchecks make startup order explicit.
- Demo credentials are clearly separated from production secrets.

## Current limitations

- Plain-text demo passwords are not production-safe.
- The snapshot repository rewrites all stored collections after mutations.
- Some client behavior has stronger test coverage than other areas.
- Question-type settings lack HTTP server routes.
- Static GitHub Pages content may lag behind `main`.
- Centralized observability and production email services are not implemented.
