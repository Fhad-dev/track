const { query } = require('../database/pool');
const { ApiError } = require('../middleware/errorHandler');

async function listGames() {
  const { rows } = await query(
    `SELECT id, slug, name, short_name, release_year, accent_color, cover_image, status, sort_order
     FROM games ORDER BY sort_order ASC`
  );
  return rows;
}

async function getGameBySlug(slug) {
  const { rows } = await query(`SELECT * FROM games WHERE slug = $1`, [slug]);
  if (!rows[0]) throw new ApiError(404, 'Game not found.');
  return rows[0];
}

async function listWeaponCategories() {
  const { rows } = await query(`SELECT * FROM weapon_categories ORDER BY sort_order ASC`);
  return rows;
}

async function listMasteryCategories(gameId) {
  const { rows } = await query(
    `SELECT * FROM mastery_categories WHERE game_id = $1 ORDER BY sort_order ASC`,
    [gameId]
  );
  return rows;
}

/**
 * List weapons for a game, optionally including a given user's progress
 * (completion counts). If userId is null, progress fields are omitted.
 */
async function listWeaponsForGame(gameSlug, userId, { search, categoryKey } = {}) {
  const game = await getGameBySlug(gameSlug);

  const params = [game.id];
  let where = `w.game_id = $1`;
  if (categoryKey) {
    params.push(categoryKey);
    where += ` AND wc.key = $${params.length}`;
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where += ` AND LOWER(w.name) LIKE $${params.length}`;
  }

  const { rows: weapons } = await query(
    `SELECT w.id, w.slug, w.name, w.image, w.sort_order, wc.key AS category_key, wc.label AS category_label
     FROM weapons w
     JOIN weapon_categories wc ON wc.id = w.category_id
     WHERE ${where}
     ORDER BY wc.sort_order ASC, w.sort_order ASC, w.name ASC`,
    params
  );

  if (weapons.length === 0) return { game, weapons: [] };

  const weaponIds = weapons.map((w) => w.id);
  const challengeCounts = await query(
    `SELECT weapon_id, COUNT(*)::int AS total FROM camo_challenges WHERE weapon_id = ANY($1) GROUP BY weapon_id`,
    [weaponIds]
  );
  const totalByWeapon = Object.fromEntries(challengeCounts.rows.map((r) => [r.weapon_id, r.total]));

  let completedByWeapon = {};
  if (userId) {
    const { rows: completedRows } = await query(
      `SELECT c.weapon_id, COUNT(*)::int AS completed
       FROM user_progress up
       JOIN camo_challenges c ON c.id = up.challenge_id
       WHERE up.user_id = $1 AND c.weapon_id = ANY($2)
       GROUP BY c.weapon_id`,
      [userId, weaponIds]
    );
    completedByWeapon = Object.fromEntries(completedRows.map((r) => [r.weapon_id, r.completed]));
  }

  const enriched = weapons.map((w) => {
    const total = totalByWeapon[w.id] || 0;
    const completed = completedByWeapon[w.id] || 0;
    return {
      ...w,
      totalChallenges: total,
      completedChallenges: completed,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  return { game, weapons: enriched };
}

async function getWeaponDetail(weaponId, userId) {
  const { rows } = await query(
    `SELECT w.*, g.slug AS game_slug, g.name AS game_name, g.accent_color, wc.key AS category_key, wc.label AS category_label
     FROM weapons w
     JOIN games g ON g.id = w.game_id
     JOIN weapon_categories wc ON wc.id = w.category_id
     WHERE w.id = $1`,
    [weaponId]
  );
  const weapon = rows[0];
  if (!weapon) throw new ApiError(404, 'Weapon not found.');

  const { rows: challenges } = await query(
    `SELECT * FROM camo_challenges WHERE weapon_id = $1 ORDER BY sort_order ASC`,
    [weaponId]
  );
  const { rows: masteryCamos } = await query(
    `SELECT mc.*, mcat.key AS category_key, mcat.label AS category_label, mcat.image AS category_image
     FROM mastery_camos mc
     JOIN mastery_categories mcat ON mcat.id = mc.mastery_category_id
     WHERE mc.weapon_id = $1
     ORDER BY mcat.sort_order ASC`,
    [weaponId]
  );

  let completedChallengeIds = new Set();
  let completedMasteryIds = new Set();
  if (userId) {
    const { rows: progress } = await query(
      `SELECT challenge_id, mastery_camo_id FROM user_progress
       WHERE user_id = $1 AND (challenge_id = ANY($2) OR mastery_camo_id = ANY($3))`,
      [userId, challenges.map((c) => c.id), masteryCamos.map((m) => m.id)]
    );
    completedChallengeIds = new Set(progress.filter((p) => p.challenge_id).map((p) => p.challenge_id));
    completedMasteryIds = new Set(progress.filter((p) => p.mastery_camo_id).map((p) => p.mastery_camo_id));
  }

  return {
    weapon,
    challenges: challenges.map((c) => ({ ...c, completed: completedChallengeIds.has(c.id) })),
    masteryCamos: masteryCamos.map((m) => ({ ...m, completed: completedMasteryIds.has(m.id) })),
  };
}

async function searchAll(term, userId) {
  const like = `%${term.toLowerCase()}%`;
  const { rows: weapons } = await query(
    `SELECT w.id, w.name, w.slug, g.slug AS game_slug, g.name AS game_name, wc.label AS category_label
     FROM weapons w
     JOIN games g ON g.id = w.game_id
     JOIN weapon_categories wc ON wc.id = w.category_id
     WHERE LOWER(w.name) LIKE $1 OR LOWER(g.name) LIKE $1 OR LOWER(wc.label) LIKE $1
     LIMIT 25`,
    [like]
  );
  const { rows: masteryHits } = await query(
    `SELECT DISTINCT w.id, w.name, w.slug, g.slug AS game_slug, g.name AS game_name, mcat.label AS mastery_label
     FROM mastery_categories mcat
     JOIN mastery_camos mc ON mc.mastery_category_id = mcat.id
     JOIN weapons w ON w.id = mc.weapon_id
     JOIN games g ON g.id = w.game_id
     WHERE LOWER(mcat.label) LIKE $1
     LIMIT 25`,
    [like]
  );
  return { weapons, masteryMatches: masteryHits };
}

module.exports = {
  listGames,
  getGameBySlug,
  listWeaponCategories,
  listMasteryCategories,
  listWeaponsForGame,
  getWeaponDetail,
  searchAll,
};
