-- NES COD Camo Tracker - Initial Schema
-- Run via: npm run migrate

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username           VARCHAR(32) NOT NULL UNIQUE,
  username_lower     VARCHAR(32) NOT NULL UNIQUE,
  email              VARCHAR(255) UNIQUE,
  password_hash      TEXT NOT NULL,
  is_admin           BOOLEAN NOT NULL DEFAULT FALSE,
  is_public          BOOLEAN NOT NULL DEFAULT FALSE,
  favorite_game_slug VARCHAR(64),
  failed_login_count SMALLINT NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (username_lower);

-- ---------------------------------------------------------------------------
-- SESSIONS (managed by connect-pg-simple, created via its own bootstrap,
-- but declared here for documentation / manual setups)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);

-- ---------------------------------------------------------------------------
-- GAMES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(64) NOT NULL UNIQUE,
  name          VARCHAR(128) NOT NULL,
  short_name    VARCHAR(32),
  release_year  SMALLINT,
  accent_color  VARCHAR(16) NOT NULL DEFAULT '#F4F2EB',
  cover_image   TEXT,
  status        VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming_soon','disabled')),
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- MASTERY CATEGORY DEFINITIONS (per game, configurable - not forced)
-- e.g. mw2019 -> Gold, Platinum, Damascus, Obsidian
--      bo6     -> Gold, Diamond, Dark Spine
--      bo7     -> Gold, Diamond, Orion (example - fully configurable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mastery_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  key         VARCHAR(32) NOT NULL, -- e.g. 'gold', 'platinum', 'dark_matter'
  label       VARCHAR(64) NOT NULL, -- display name e.g. 'Dark Matter'
  image       TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (game_id, key)
);

-- ---------------------------------------------------------------------------
-- WEAPON CATEGORIES (global taxonomy, but weapons reference which applies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weapon_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        VARCHAR(32) NOT NULL UNIQUE, -- 'assault_rifle', 'smg', etc.
  label      VARCHAR(64) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- WEAPONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weapons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES weapon_categories(id),
  slug          VARCHAR(96) NOT NULL,
  name          VARCHAR(96) NOT NULL,
  image         TEXT, -- e.g. /assets/camos/mw2019/kilo-141/weapon.webp
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_weapons_game ON weapons (game_id);
CREATE INDEX IF NOT EXISTS idx_weapons_category ON weapons (category_id);

-- ---------------------------------------------------------------------------
-- CAMO CHALLENGES (per weapon, ordinary progression challenges)
-- category: 'base' | 'special' | custom keys defined per game
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS camo_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_id    UUID NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  name         VARCHAR(96) NOT NULL,
  requirement  TEXT NOT NULL,
  image        TEXT,
  category     VARCHAR(32) NOT NULL DEFAULT 'base',
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_weapon ON camo_challenges (weapon_id);

-- ---------------------------------------------------------------------------
-- MASTERY CAMOS (per weapon, tied to a mastery_category)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mastery_camos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_id            UUID NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  mastery_category_id  UUID NOT NULL REFERENCES mastery_categories(id) ON DELETE CASCADE,
  requirement          TEXT NOT NULL,
  sort_order           SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (weapon_id, mastery_category_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_camos_weapon ON mastery_camos (weapon_id);

-- ---------------------------------------------------------------------------
-- USER PROGRESS - one row per (user, challenge OR mastery camo)
-- We use a polymorphic-ish design via two nullable FKs with a check
-- constraint so a single progress table covers both challenge types.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id   UUID REFERENCES camo_challenges(id) ON DELETE CASCADE,
  mastery_camo_id UUID REFERENCES mastery_camos(id) ON DELETE CASCADE,
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_target_only CHECK (
    (challenge_id IS NOT NULL AND mastery_camo_id IS NULL) OR
    (challenge_id IS NULL AND mastery_camo_id IS NOT NULL)
  ),
  UNIQUE (user_id, challenge_id),
  UNIQUE (user_id, mastery_camo_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress (user_id);

-- ---------------------------------------------------------------------------
-- USER SETTINGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme        VARCHAR(16) NOT NULL DEFAULT 'dark',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
