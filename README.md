# ExamApp

Initial Express server and React client project.

## Server

Install dependencies:

```sh
npm install
```

Start the Express server:

```sh
npm start
```

Development mode with file watching:

```sh
npm run dev
```

The server runs on `http://localhost:3000` by default and exposes:

- `GET /`
- `GET /health`
- `GET /api/db`
- `POST /api/db/reset`
- CRUD:
  - `GET /api/exams`
  - `POST /api/exams`
  - `GET /api/exams/:examId`
  - `PUT /api/exams/:examId`
  - `DELETE /api/exams/:examId`
  - `GET /api/users`
  - `POST /api/users`
  - `GET /api/users/:userId`
  - `PUT /api/users/:userId`
  - `DELETE /api/users/:userId`

The `/api` routes use an in-memory JSON store seeded with the same demo roles as
the client mock mode:

- Teacher: `teacher@example.com` / `teacher123`
- Student: `student@example.com` / `student123`

Because the store is memory-only, restarting the Express process resets server
data.

## Client API Mode

Keep client-only mock mode:

```sh
npm --prefix client run dev:mock
```

Call the Express server instead:

```sh
npm --prefix client run dev:server
```

The mode files are `client/.env.mock` and `client/.env.server`. Example files are
also available as `client/.env.mock.example` and `client/.env.server.example`.

From the repository root, these shortcuts are also available:

```sh
npm run client:dev:mock
npm run client:dev:server
```

## VS Code Debugging

The workspace includes debug configurations for:

- `Debug Client Only (Mock API)`: starts Vite with `client/.env.mock`.
- `Debug Server Only`: starts `server.js` with the Node debugger.
- `Debug Client (Server API)`: starts Vite with `client/.env.server`.
- `Debug Both (Client + Server)`: starts the server debugger and server-backed client together.

Each dev task uses a dedicated terminal panel so client and server logs stay separate.
