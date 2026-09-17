require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied() {
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  console.log('[migrate] connecting to database...');
  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ranAny = false;
  for (const file of files) {
    if (applied.has(file)) continue;
    ranAny = true;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[migrate] applying ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] ${file} OK`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] FAILED on ${file}:`, err.message);
      process.exitCode = 1;
      client.release();
      return;
    } finally {
      client.release();
    }
  }

  if (!ranAny) console.log('[migrate] nothing to do, schema up to date.');
  else console.log('[migrate] all migrations applied.');
}

run()
  .catch((err) => {
    console.error('[migrate] fatal error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
