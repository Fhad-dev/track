const { query } = require('../database/pool');
const { ApiError } = require('../middleware/errorHandler');

async function markChallengeComplete(userId, challengeId) {
  const { rows } = await query(`SELECT id FROM camo_challenges WHERE id = $1`, [challengeId]);
  if (!rows[0]) throw new ApiError(404, 'Challenge not found.');
  await query(
    `INSERT INTO user_progress (user_id, challenge_id) VALUES ($1, $2)
     ON CONFLICT (user_id, challenge_id) DO NOTHING`,
    [userId, challengeId]
  );
}

async function markChallengeIncomplete(userId, challengeId) {
  await query(`DELETE FROM user_progress WHERE user_id = $1 AND challenge_id = $2`, [userId, challengeId]);
}

async function markMasteryComplete(userId, masteryCamoId) {
  const { rows } = await query(`SELECT id FROM mastery_camos WHERE id = $1`, [masteryCamoId]);
  if (!rows[0]) throw new ApiError(404, 'Mastery camo not found.');
  await query(
    `INSERT INTO user_progress (user_id, mastery_camo_id) VALUES ($1, $2)
     ON CONFLICT (user_id, mastery_camo_id) DO NOTHING`,
    [userId, masteryCamoId]
  );
}

async function markMasteryIncomplete(userId, masteryCamoId) {
  await query(`DELETE FROM user_progress WHERE user_id = $1 AND mastery_camo_id = $2`, [userId, masteryCamoId]);
}

/** Full progress summary for a user: overall %, per-game %, per-category counts. */
async function getUserProgressSummary(userId) {
  const { rows: games } = await query(
    `SELECT id, slug, name, short_name, accent_color, status FROM games WHERE status != 'coming_soon' ORDER BY sort_order ASC`
  );

  const { rows: totals } = await query(
    `SELECT g.id AS game_id, COUNT(cc.id)::int AS total
     FROM games g
     JOIN weapons w ON w.game_id = g.id
     JOIN camo_challenges cc ON cc.weapon_id = w.id
     GROUP BY g.id`
  );
  const totalByGame = Object.fromEntries(totals.map((r) => [r.game_id, r.total]));

  const { rows: completed } = await query(
    `SELECT g.id AS game_id, COUNT(up.id)::int AS completed
     FROM user_progress up
     JOIN camo_challenges cc ON cc.id = up.challenge_id
     JOIN weapons w ON w.id = cc.weapon_id
     JOIN games g ON g.id = w.game_id
     WHERE up.user_id = $1
     GROUP BY g.id`,
    [userId]
  );
  const completedByGame = Object.fromEntries(completed.map((r) => [r.game_id, r.completed]));

  let overallTotal = 0;
  let overallCompleted = 0;
  let gamesCompletedCount = 0;

  const perGame = games.map((g) => {
    const total = totalByGame[g.id] || 0;
    const done = completedByGame[g.id] || 0;
    overallTotal += total;
    overallCompleted += done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    if (total > 0 && done === total) gamesCompletedCount += 1;
    return { slug: g.slug, name: g.name, shortName: g.short_name, accentColor: g.accent_color, total, completed: done, percent };
  });

  const { rows: weaponCountRows } = await query(
    `SELECT COUNT(DISTINCT w.id)::int AS weapons_completed
     FROM weapons w
     WHERE (
       SELECT COUNT(*) FROM camo_challenges cc WHERE cc.weapon_id = w.id
     ) > 0
     AND (
       SELECT COUNT(*) FROM camo_challenges cc WHERE cc.weapon_id = w.id
     ) = (
       SELECT COUNT(*) FROM user_progress up
       JOIN camo_challenges cc2 ON cc2.id = up.challenge_id
       WHERE cc2.weapon_id = w.id AND up.user_id = $1
     )`,
    [userId]
  );

  return {
    overallPercent: overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0,
    overallCompleted,
    overallTotal,
    gamesCompletedCount,
    gamesTotalCount: games.length,
    weaponsCompleted: weaponCountRows[0]?.weapons_completed || 0,
    perGame,
  };
}

module.exports = {
  markChallengeComplete,
  markChallengeIncomplete,
  markMasteryComplete,
  markMasteryIncomplete,
  getUserProgressSummary,
};
