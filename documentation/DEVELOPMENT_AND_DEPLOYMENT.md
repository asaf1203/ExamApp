# Development, Testing, and Deployment

[Back to main README](../README.md)

## Prerequisites

- Node.js 22
- npm
- PostgreSQL, or Docker with Docker Compose

## Local installation

```sh
npm ci
npm --prefix client ci
```

## Configuration

### Server

Copy `.env.example` to `.env`:

```dotenv
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/exam_app
```

Additional server variables:

- `API_STORE=memory` disables PostgreSQL synchronization for isolated tests.
- `SERVE_CLIENT=0` disables static SPA serving from Express.

### Client

Use one of the committed Vite modes:

```sh
npm run client:dev:mock
npm run client:dev:server
```

Or copy `client/.env.server` to `client/.env.local` for HTTP-backed local
development.

Only `VITE_*` variables are exposed to browser code. They configure:

- API backend and URLs
- request timeout, retries, and caches
- session/token storage keys
- autosave and page sizes
- feature flags
- theme and notifications
- mock latency/error simulation
- logging and diagnostics
- optional runtime configuration

Never put database credentials or private secrets in Vite variables.

## Run without Docker

Prepare PostgreSQL:

```sh
createdb exam_app
npm run db:schema
npm run db:seed
npm run db:test
```

Start API and client in separate terminals:

```sh
npm run dev
npm run client:dev:server
```

- Client: <http://localhost:5173>
- API: <http://localhost:3000>

Development seed accounts:

- Teacher: `teacher@example.com` / `teacher123`
- Student: `student@example.com` / `student123`

## Docker architecture

Docker Compose defines three services:

- **client:** Node builds the Vite bundle; Nginx serves it and proxies `/api`.
- **server:** Node 22 Alpine runs Express.
- **db:** PostgreSQL 16 Alpine stores durable data.

```mermaid
flowchart LR
    User["Browser"] -->|"localhost:8080"| Client["client / Nginx"]
    Client -->|"/api → server:3000"| Server["server / Express"]
    Server -->|"DATABASE_URL → db:5432"| DB[("PostgreSQL")]
    DB --> Volume[("postgres_data")]
```

All services share the `exam-net` bridge network.

### Published ports

- Client: `${CLIENT_PORT:-8080}` → 80
- Server: `${SERVER_PORT:-3000}` → 3000
- PostgreSQL: `${POSTGRES_PORT:-5432}` → 5432

### Startup order and health

1. PostgreSQL starts and passes `pg_isready`.
2. Server entrypoint waits for PostgreSQL, applies the schema, seeds an empty
   database, starts Express, and passes `/health`.
3. Client starts after the server is healthy; its healthcheck verifies the
   proxied server health endpoint.

The named `postgres_data` volume persists database files between restarts.

### Commands

```sh
docker compose up --build -d --wait
docker compose ps
docker compose logs
docker compose down
```

Use `docker compose down -v` only when the database volume should be deleted.

## Public deployment

- Render: <https://examappdeploy.onrender.com>
- The `docs/` directory also contains a committed static frontend build intended
  for GitHub Pages. It does not include Express or PostgreSQL by itself.

To refresh the static Pages bundle:

```sh
npm --prefix client run build
rm -rf docs/*
cp -R client/dist/* docs/
```

## Testing

### Client

```sh
npm --prefix client test -- --run
npm --prefix client run lint
```

Vitest and Testing Library cover:

- authentication
- configuration
- route matching
- teacher dashboard UI
- question-type settings
- connected teacher/student workflow
- utility logic

Student exam-taking UI and HTTP-mode integration are not comprehensively
covered.

### Server and database

```sh
npm run test:auth
npm run db:test
npm run db:compat
```

- `test:auth`: Supertest authorization matrix for 401/403 behavior, role
  separation, invalid tokens, and sensitive endpoints.
- `db:test`: PostgreSQL connectivity.
- `db:compat`: relational round-trip compatibility with frontend object shapes.

### Deployment smoke test

With Compose running:

```sh
npm run test:deploy
```

The script verifies:

- direct server health
- health through Nginx
- client HTML
- login through the proxy
- authenticated `/api/auth/me`
- anonymous rejection from a protected teacher route

## CI/CD

### CI checks

`.github/workflows/security.yml` runs on pull requests and pushes to shared
branches:

1. **Gitleaks** scans complete Git history for secrets.
2. **API authorization** installs Node dependencies and runs `test:auth` with
   the isolated memory store.
3. **Docker deployment** builds the Compose stack, waits for health, runs the
   smoke test, prints logs on failure, and tears down containers/volumes.

Client Vitest, ESLint, `db:test`, and `db:compat` are currently local checks and
are not included in CI.

### Daily image publishing

`.github/workflows/publish-docker.yml` runs daily at 02:00 UTC and can be
started manually.

Required GitHub Actions secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

It publishes:

- `<username>/exam-app-server`
- `<username>/exam-app-client`

Each image receives:

- `latest`
- UTC date (`YYYYMMDD`)
- short commit (`sha-xxxxxxx`)

Buildx uses GitHub Actions caching for both images.

## Logging and operations

- Server/database scripts log startup, schema, seed, and errors to
  stdout/stderr.
- Docker captures those streams; inspect them with `docker compose logs`.
- Client request logging is controlled by `VITE_ENABLE_REQUEST_LOGGING`.
- Client log level is controlled by `VITE_LOG_LEVEL`.
- Express errors return `code`, `message`, and optional `details`.
- React's `ErrorBoundary` catches unexpected rendering failures.
- CI prints Compose status and emits complete container logs on smoke-test
  failure.

There is no centralized logging service or structured logging library in the
current implementation.

## Production hardening

- Hash passwords with Argon2 or bcrypt.
- Do not let public registration create teacher accounts.
- Replace whole-store snapshot persistence with targeted SQL operations.
- Consider secure HTTP-only session cookies and CSRF protection.
- Implement a real password-reset email/token flow.
- Add missing HTTP routes for question-type settings.
- Add client tests, linting, and database compatibility checks to CI.
- Keep the committed `docs/` bundle synchronized with `main`.
