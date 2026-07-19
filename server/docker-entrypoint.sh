#!/bin/sh
set -e

echo "Waiting for PostgreSQL at DATABASE_URL..."

# Retry until the database accepts connections.
until node -e "
const { pool } = require('./server/db/connect');
pool.query('SELECT 1')
  .then(() => pool.end())
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
"; do
  echo "PostgreSQL is unavailable — sleeping"
  sleep 2
done

echo "PostgreSQL is up. Applying schema..."
npm run db:schema

# Seed only when the database has no users (avoids wiping data on restart).
USER_COUNT=$(node -e "
const { pool } = require('./server/db/connect');
pool.query('SELECT COUNT(*)::int AS count FROM users')
  .then(async (result) => {
    process.stdout.write(String(result.rows[0].count));
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error.message);
    process.exit(1);
  });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "No users found. Seeding database..."
  npm run db:seed
else
  echo "Database already has data ($USER_COUNT users). Skipping seed."
fi

exec "$@"
