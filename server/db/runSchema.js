const fs = require("fs");
const path = require("path");
const { pool } = require("./connect");

async function main() {
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  await pool.query(sql);
  console.log("PostgreSQL schema applied.");
}

main()
  .catch((error) => {
    console.error("Failed to apply PostgreSQL schema.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
