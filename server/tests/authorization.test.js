process.env.API_STORE = "memory";
process.env.SERVE_CLIENT = "0";

const { beforeEach, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../createApp");
const { createSeedStore, replaceStore } = require("../mockStore");

const app = createApp();

const authHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const login = async (email, password) => {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  assert.equal(response.status, 200, `login failed for ${email}: ${response.body?.message}`);
  return response.body.token;
};

beforeEach(() => {
  replaceStore(createSeedStore());
});

describe("API authorization — unauthenticated access", () => {
  const mustRejectAnonymous = [
    ["GET", "/api/auth/me"],
    ["GET", "/api/notifications"],
    ["POST", "/api/notifications/read"],
    ["GET", "/api/users"],
    ["GET", "/api/db"],
    ["POST", "/api/db/reset"],
    ["GET", "/api/exams"],
    ["GET", "/api/exams/EX-101"],
    ["POST", "/api/exams"],
    ["PUT", "/api/exams/EX-101"],
    ["DELETE", "/api/exams/EX-101"],
    ["GET", "/api/scores"],
    ["GET", "/api/exams/EX-101/scores"],
    ["GET", "/api/student/exams"],
    ["GET", "/api/student/exams/EX-101"],
    ["POST", "/api/student/exams/EX-101/attempts"],
    ["GET", "/api/student/attempts/missing"],
    ["PUT", "/api/student/attempts/missing/draft"],
    ["POST", "/api/student/attempts/missing/submit"],
    ["GET", "/api/student/attempts/missing/result"],
    ["GET", "/api/student/activity"],
    ["GET", "/api/teacher/dashboard"],
    ["GET", "/api/teacher/exams"],
    ["POST", "/api/teacher/exams"],
    ["GET", "/api/teacher/exams/EX-101"],
    ["PUT", "/api/teacher/exams/EX-101"],
    ["DELETE", "/api/teacher/exams/EX-101"],
    ["GET", "/api/teacher/submissions"],
  ];

  for (const [method, path] of mustRejectAnonymous) {
    test(`${method} ${path} returns 401 without a token`, async () => {
      const response = await request(app)[method.toLowerCase()](path).send({});
      assert.equal(
        response.status,
        401,
        `${method} ${path} should require auth, got ${response.status}`,
      );
      assert.equal(response.body.code, "AUTH_REQUIRED");
    });
  }

  const publicRoutes = [
    ["GET", "/api/"],
    ["GET", "/api/config"],
    ["GET", "/health"],
    ["POST", "/api/auth/password-reset"],
  ];

  for (const [method, path] of publicRoutes) {
    test(`${method} ${path} stays public`, async () => {
      const response = await request(app)[method.toLowerCase()](path).send({ email: "x@example.com" });
      assert.ok(
        response.status < 400,
        `${method} ${path} should remain public, got ${response.status}`,
      );
    });
  }
});

describe("API authorization — role separation", () => {
  test("student cannot access teacher routes", async () => {
    const token = await login("student@example.com", "student123");
    const routes = [
      ["GET", "/api/teacher/dashboard"],
      ["GET", "/api/teacher/exams"],
      ["GET", "/api/users"],
      ["GET", "/api/db"],
      ["GET", "/api/exams"],
      ["GET", "/api/scores"],
    ];

    for (const [method, path] of routes) {
      const response = await request(app)
        [method.toLowerCase()](path)
        .set(authHeader(token));
      assert.equal(
        response.status,
        403,
        `student ${method} ${path} should be forbidden, got ${response.status}`,
      );
      assert.equal(response.body.code, "FORBIDDEN");
    }
  });

  test("teacher cannot access student routes", async () => {
    const token = await login("teacher@example.com", "teacher123");
    const routes = [
      ["GET", "/api/student/exams"],
      ["GET", "/api/student/activity"],
      ["GET", "/api/student/exams/EX-101"],
    ];

    for (const [method, path] of routes) {
      const response = await request(app)
        [method.toLowerCase()](path)
        .set(authHeader(token));
      assert.equal(
        response.status,
        403,
        `teacher ${method} ${path} should be forbidden, got ${response.status}`,
      );
      assert.equal(response.body.code, "FORBIDDEN");
    }
  });

  test("student can access student exams list", async () => {
    const token = await login("student@example.com", "student123");
    const response = await request(app).get("/api/student/exams").set(authHeader(token));
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.items) || typeof response.body.total === "number");
  });

  test("teacher can access teacher dashboard", async () => {
    const token = await login("teacher@example.com", "teacher123");
    const response = await request(app).get("/api/teacher/dashboard").set(authHeader(token));
    assert.equal(response.status, 200);
  });

  test("invalid token is rejected", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set(authHeader("not-a-real-token"));
    assert.equal(response.status, 401);
    assert.equal(response.body.code, "AUTH_REQUIRED");
  });
});

describe("API authorization — sensitive data exposure", () => {
  test("anonymous clients cannot dump the full database", async () => {
    const response = await request(app).get("/api/db");
    assert.equal(response.status, 401);
    assert.equal(response.body.users, undefined);
    assert.equal(response.body.sessions, undefined);
  });

  test("anonymous clients cannot read exam answer keys via legacy exams API", async () => {
    const response = await request(app).get("/api/exams/EX-101");
    assert.equal(response.status, 401);
    assert.equal(response.body.questions, undefined);
  });
});
