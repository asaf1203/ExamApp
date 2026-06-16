const assert = require("assert");
const { createSeedStore } = require("../mockStore");
const { loadStore } = require("./storeRepository");
const { pool } = require("./connect");

const importantExamKeys = [
  "id",
  "title",
  "description",
  "durationMinutes",
  "passingGrade",
  "questions",
  "availability",
];

async function main() {
  const mock = createSeedStore();
  const db = await loadStore();
  const mockExam = mock.exams[0];
  const dbExam = db.exams.find((exam) => exam.id === mockExam.id);
  const mockAttempt = mock.examAttempts[0];
  const dbAttempt = db.examAttempts.find((attempt) => attempt.id === mockAttempt.id);

  assert(dbExam, `Missing seeded exam ${mockExam.id}`);
  assert(dbAttempt, `Missing seeded submission ${mockAttempt.id}`);

  for (const key of importantExamKeys) {
    assert.deepStrictEqual(dbExam[key], mockExam[key], `Exam key mismatch: ${key}`);
  }

  assert(Array.isArray(dbExam.questions), "Exam questions must remain a nested array");
  assert.deepStrictEqual(dbAttempt.answers, mockAttempt.answers, "Attempt answers map changed shape");
  assert(Array.isArray(dbAttempt.scoreBreakdown), "Score breakdown must remain an array");

  console.log("Compatibility check passed: PostgreSQL data matches frontend mock shapes.");
}

main()
  .catch((error) => {
    console.error("Compatibility check failed.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
