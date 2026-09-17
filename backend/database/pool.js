const { Pool } = require('pg');

const useSsl = String(process.env.PGSSL).toLowerCase() === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Never crash the whole process on an idle client error; log and continue.
  // eslint-disable-next-line no-console
  console.error('[db] unexpected idle client error', err.message);
});

/**
 * Run a parameterized query. Always use placeholders ($1, $2, ...) -
 * never string-concatenate user input into SQL.
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback within a single client/transaction.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
