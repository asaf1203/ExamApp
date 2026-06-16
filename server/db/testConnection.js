const { pool } = require("./connect");

async function main() {
  const result = await pool.query("SELECT now() AS now");
  console.log(`PostgreSQL connection OK: ${result.rows[0].now.toISOString()}`);
}

main()
  .catch((error) => {
    console.error("PostgreSQL connection failed.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
