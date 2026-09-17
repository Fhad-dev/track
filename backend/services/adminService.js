const { query } = require('../database/pool');
const { ApiError } = require('../middleware/errorHandler');
const { isSlug } = require('../utils/validate');

async function createGame({ slug, name, shortName, releaseYear, accentColor, status, sortOrder }) {
  if (!isSlug(slug)) throw new ApiError(400, 'Invalid slug.');
  const { rows } = await query(
    `INSERT INTO games (slug, name, short_name, release_year, accent_color, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'active'),COALESCE($7,0)) RETURNING *`,
    [slug, name, shortName || null, releaseYear || null, accentColor || '#F4F2EB', status, sortOrder]
  );
  return rows[0];
}

async function updateGame(id, fields) {
  const allowed = ['name', 'short_name', 'release_year', 'accent_color', 'status', 'sort_order', 'cover_image'];
  const sets = [];
  const params = [id];
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.includes(key)) continue;
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) throw new ApiError(400, 'No valid fields to update.');
  sets.push('updated_at = now()');
  const { rows } = await query(`UPDATE games SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  if (!rows[0]) throw new ApiError(404, 'Game not found.');
  return rows[0];
}

async function createWeapon({ gameId, categoryId, slug, name, image, sortOrder }) {
  if (!isSlug(slug)) throw new ApiError(400, 'Invalid slug.');
  const { rows } = await query(
    `INSERT INTO weapons (game_id, category_id, slug, name, image, sort_order)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,0)) RETURNING *`,
    [gameId, categoryId, slug, name, image || null, sortOrder]
  );
  return rows[0];
}

async function updateWeapon(id, fields) {
  const allowed = ['name', 'category_id', 'image', 'sort_order'];
  const sets = [];
  const params = [id];
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.includes(key)) continue;
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) throw new ApiError(400, 'No valid fields to update.');
  sets.push('updated_at = now()');
  const { rows } = await query(`UPDATE weapons SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  if (!rows[0]) throw new ApiError(404, 'Weapon not found.');
  return rows[0];
}

async function deleteWeapon(id) {
  const { rowCount } = await query(`DELETE FROM weapons WHERE id = $1`, [id]);
  if (rowCount === 0) throw new ApiError(404, 'Weapon not found.');
}

async function createChallenge({ weaponId, name, requirement, image, category, sortOrder }) {
  const { rows } = await query(
    `INSERT INTO camo_challenges (weapon_id, name, requirement, image, category, sort_order)
     VALUES ($1,$2,$3,$4,COALESCE($5,'base'),COALESCE($6,0)) RETURNING *`,
    [weaponId, name, requirement, image || null, category, sortOrder]
  );
  return rows[0];
}

async function updateChallenge(id, fields) {
  const allowed = ['name', 'requirement', 'image', 'category', 'sort_order'];
  const sets = [];
  const params = [id];
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.includes(key)) continue;
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) throw new ApiError(400, 'No valid fields to update.');
  sets.push('updated_at = now()');
  const { rows } = await query(`UPDATE camo_challenges SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  if (!rows[0]) throw new ApiError(404, 'Challenge not found.');
  return rows[0];
}

async function deleteChallenge(id) {
  const { rowCount } = await query(`DELETE FROM camo_challenges WHERE id = $1`, [id]);
  if (rowCount === 0) throw new ApiError(404, 'Challenge not found.');
}

async function setMasteryCategoryImage(id, image) {
  const { rows } = await query(
    `UPDATE mastery_categories SET image = $2 WHERE id = $1 RETURNING *`,
    [id, image]
  );
  if (!rows[0]) throw new ApiError(404, 'Mastery category not found.');
  return rows[0];
}

module.exports = {
  createGame,
  updateGame,
  createWeapon,
  updateWeapon,
  deleteWeapon,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  setMasteryCategoryImage,
};
