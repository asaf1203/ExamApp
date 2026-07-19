const fs = require("fs");
const path = require("path");
const express = require("express");
const mockRoutes = require("./mockRoutes");

const createApp = () => {
  const app = express();
  const clientDistPath = path.join(__dirname, "..", "client", "dist");
  const clientIndexPath = path.join(clientDistPath, "index.html");
  const serveClient = process.env.SERVE_CLIENT !== "0" && fs.existsSync(clientIndexPath);

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

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
    });
  });

  if (serveClient) {
    app.use(express.static(clientDistPath));

    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
      res.sendFile(clientIndexPath);
    });
  } else {
    app.get("/", (req, res) => {
      res.json({
        message: "ExamApp Express server is running",
      });
    });
  }

  return app;
};

module.exports = { createApp };
