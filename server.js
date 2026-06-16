const express = require("express");
const mockRoutes = require("./server/mockRoutes");
const { loadStore } = require("./server/db/storeRepository");
const { replaceStore } = require("./server/mockStore");

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use("/api", mockRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "ExamApp Express server is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

const start = async () => {
  const store = await loadStore();

  if (!store.users.length) {
    console.warn(
      "PostgreSQL database has no seed data. Run `npm run db:seed` before using the app.",
    );
  }

  replaceStore(store);

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server.");
  console.error(error.message);
  process.exit(1);
});
