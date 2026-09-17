const argon2 = require('argon2');
const { query } = require('../database/pool');
const { ApiError } = require('../middleware/errorHandler');

const PUBLIC_FIELDS = `id, username, is_admin, is_public, favorite_game_slug, created_at`;

async function findById(id) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByUsername(username) {
  const { rows } = await query(`SELECT * FROM users WHERE username_lower = $1`, [username.toLowerCase()]);
  return rows[0] || null;
}

async function createUser({ username, password, email }) {
  const existing = await findByUsername(username);
  if (existing) throw new ApiError(409, 'That username is already taken.');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const { rows } = await query(
    `INSERT INTO users (username, username_lower, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_FIELDS}`,
    [username, username.toLowerCase(), email || null, passwordHash]
  );
  await query(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [rows[0].id]);
  return rows[0];
}

const MAX_FAILED_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

async function verifyCredentials(username, password) {
  const user = await findByUsername(username);
  if (!user) {
    // Still run a hash comparison to keep timing roughly constant and avoid
    // leaking which usernames exist via response time.
    await argon2.hash('dummy-password-for-timing-safety');
    throw new ApiError(401, 'Invalid username or password.');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new ApiError(423, 'Account temporarily locked due to repeated failed logins. Try again later.');
  }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    const failedCount = (user.failed_login_count || 0) + 1;
    const lockUntil = failedCount >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;
    await query(
      `UPDATE users SET failed_login_count = $1, locked_until = $2 WHERE id = $3`,
      [failedCount, lockUntil, user.id]
    );
    throw new ApiError(401, 'Invalid username or password.');
  }

  if (user.failed_login_count > 0 || user.locked_until) {
    await query(`UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1`, [user.id]);
  }

  const { password_hash, failed_login_count, locked_until, ...safeUser } = user;
  return safeUser;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  const valid = await argon2.verify(user.password_hash, currentPassword);
  if (!valid) throw new ApiError(401, 'Current password is incorrect.');
  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [newHash, userId]);
}

async function deleteAccount(userId, password) {
  const user = await findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) throw new ApiError(401, 'Password is incorrect.');
  await query(`DELETE FROM users WHERE id = $1`, [userId]); // cascades progress/settings
}

async function updateProfileSettings(userId, { isPublic, favoriteGameSlug }) {
  const { rows } = await query(
    `UPDATE users SET
       is_public = COALESCE($2, is_public),
       favorite_game_slug = COALESCE($3, favorite_game_slug),
       updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_FIELDS}`,
    [userId, isPublic, favoriteGameSlug || null]
  );
  return rows[0];
}

module.exports = {
  findById,
  findByUsername,
  createUser,
  verifyCredentials,
  changePassword,
  deleteAccount,
  updateProfileSettings,
  PUBLIC_FIELDS,
};
