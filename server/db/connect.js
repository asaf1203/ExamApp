const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. PostgreSQL routes will fail until .env is configured.");
}

const pool = new Pool({
  connectionString,
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
