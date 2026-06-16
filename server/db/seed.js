const { createSeedStore } = require("../mockStore");
const { saveStore } = require("./storeRepository");
const { pool } = require("./connect");

async function main() {
  const seed = createSeedStore();
  await saveStore(seed);
  console.log(
    `Seeded ${seed.users.length} users, ${seed.exams.length} exams, and ${seed.examAttempts.length} submissions.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed PostgreSQL database.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
