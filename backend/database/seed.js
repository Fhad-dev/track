require('dotenv').config();
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');
const { pool, withTransaction } = require('./pool');

const SEEDS_DIR = path.join(__dirname, '..', '..', 'seeds');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));

function placeholderImage(gameSlug, weaponSlug, filename) {
  return `/assets/camos/${gameSlug}/${weaponSlug}/${filename}`;
}

async function seedGames(client) {
  const games = readJson('games.json');
  const idBySlug = {};
  for (const g of games) {
    const { rows } = await client.query(
      `INSERT INTO games (slug, name, short_name, release_year, accent_color, status, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (slug) DO UPDATE SET
         name=$2, short_name=$3, release_year=$4, accent_color=$5, status=$6, sort_order=$7, updated_at=now()
       RETURNING id, slug`,
      [g.slug, g.name, g.short_name, g.release_year, g.accent_color, g.status, g.sort_order]
    );
    idBySlug[rows[0].slug] = rows[0].id;
  }
  return idBySlug;
}

async function seedWeaponCategories(client) {
  const cats = readJson('weapon_categories.json');
  const idByKey = {};
  for (const c of cats) {
    const { rows } = await client.query(
      `INSERT INTO weapon_categories (key, label, sort_order)
       VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET label=$2, sort_order=$3
       RETURNING id, key`,
      [c.key, c.label, c.sort_order]
    );
    idByKey[rows[0].key] = rows[0].id;
  }
  return idByKey;
}

async function seedMasteryCategories(client, gameIdBySlug) {
  const masteryByGame = readJson('mastery_categories.json');
  const idByGameAndKey = {};
  for (const [gameSlug, categories] of Object.entries(masteryByGame)) {
    const gameId = gameIdBySlug[gameSlug];
    if (!gameId) continue;
    for (const m of categories) {
      const { rows } = await client.query(
        `INSERT INTO mastery_categories (game_id, key, label, sort_order)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (game_id, key) DO UPDATE SET label=$3, sort_order=$4
         RETURNING id, key`,
        [gameId, m.key, m.label, m.sort_order]
      );
      idByGameAndKey[`${gameSlug}:${m.key}`] = rows[0].id;
    }
  }
  return idByGameAndKey;
}

async function seedWeaponsAndChallenges(client, gameIdBySlug, categoryIdByKey, masteryIdByGameKey) {
  const weaponsByGame = readJson('weapons.json');
  const templates = readJson('challenge_templates.json');
  const masteryByGame = readJson('mastery_categories.json');

  for (const [gameSlug, weapons] of Object.entries(weaponsByGame)) {
    const gameId = gameIdBySlug[gameSlug];
    if (!gameId) continue;

    for (let i = 0; i < weapons.length; i += 1) {
      const w = weapons[i];
      const categoryId = categoryIdByKey[w.category];
      const weaponImage = placeholderImage(gameSlug, w.slug, 'weapon.webp');

      const { rows } = await client.query(
        `INSERT INTO weapons (game_id, category_id, slug, name, image, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (game_id, slug) DO UPDATE SET
           category_id=$2, name=$4, image=$5, sort_order=$6, updated_at=now()
         RETURNING id`,
        [gameId, categoryId, w.slug, w.name, weaponImage, i]
      );
      const weaponId = rows[0].id;

      // Base + special challenges
      let order = 0;
      for (const group of ['base', 'special']) {
        for (const t of templates[group]) {
          const image = placeholderImage(gameSlug, w.slug, `${group}-${String(order + 1).padStart(2, '0')}.webp`);
          await client.query(
            `INSERT INTO camo_challenges (weapon_id, name, requirement, image, category, sort_order)
             SELECT $1,$2,$3,$4,$5,$6
             WHERE NOT EXISTS (
               SELECT 1 FROM camo_challenges WHERE weapon_id=$1 AND name=$2
             )`,
            [weaponId, t.name, t.requirement, image, group, order]
          );
          order += 1;
        }
      }

      // Mastery camos for this game
      const masteryCats = masteryByGame[gameSlug] || [];
      for (const m of masteryCats) {
        const masteryCategoryId = masteryIdByGameKey[`${gameSlug}:${m.key}`];
        if (!masteryCategoryId) continue;
        await client.query(
          `INSERT INTO mastery_camos (weapon_id, mastery_category_id, requirement, sort_order)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (weapon_id, mastery_category_id) DO NOTHING`,
          [weaponId, masteryCategoryId, `Complete all requirements to unlock ${m.label}.`, m.sort_order]
        );
      }
    }
  }
}

async function seedAdminBootstrap(client) {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!username || !password) {
    console.log('[seed] skipping admin bootstrap (ADMIN_BOOTSTRAP_USERNAME/PASSWORD not set)');
    return;
  }
  const { rows } = await client.query('SELECT id FROM users WHERE username_lower = $1', [username.toLowerCase()]);
  if (rows.length > 0) {
    await client.query('UPDATE users SET is_admin = TRUE WHERE id = $1', [rows[0].id]);
    console.log(`[seed] existing user ${username} promoted to admin`);
    return;
  }
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  await client.query(
    `INSERT INTO users (username, username_lower, password_hash, is_admin)
     VALUES ($1,$2,$3, TRUE)`,
    [username, username.toLowerCase(), hash]
  );
  console.log(`[seed] created admin user ${username}`);
}

async function run() {
  console.log('[seed] starting...');
  await withTransaction(async (client) => {
    const gameIdBySlug = await seedGames(client);
    const categoryIdByKey = await seedWeaponCategories(client);
    const masteryIdByGameKey = await seedMasteryCategories(client, gameIdBySlug);
    await seedWeaponsAndChallenges(client, gameIdBySlug, categoryIdByKey, masteryIdByGameKey);
    await seedAdminBootstrap(client);
  });
  console.log('[seed] complete.');
}

run()
  .catch((err) => {
    console.error('[seed] fatal error:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
