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

The `/api` routes use an in-memory JSON store seeded with the same demo roles as
the client mock mode:

- Teacher: `teacher@example.com` / `teacher123`
- Student: `student@example.com` / `student123`

Because the store is memory-only, restarting the Express process resets server
data.

## Client API Mode

Keep client-only mock mode:

```sh
VITE_API_BACKEND=mock
```

Call the Express server instead:

```sh
VITE_API_BACKEND=http
VITE_API_BASE_URL=http://localhost:3000/api
VITE_AUTH_API_URL=http://localhost:3000/api/auth
```

An example file is available at `client/.env.server.example`.
