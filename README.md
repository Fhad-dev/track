# NES — Call of Duty Camo Tracker

A full-stack, production-ready camo challenge tracker for Call of Duty. Users
create an account, browse games and weapons, mark camo challenges and
mastery camos as complete, and see their progress synced to the cloud from
any device. Includes a server-authorized admin panel for managing games,
weapons, and challenge data.

This is an original, independent fan project. It is not affiliated with or
endorsed by Activision. No proprietary assets, branding, or copyrighted
text are included — camo image assets and challenge text are meant to be
supplied by you (see "Adding Your Own Data" below).

---

## 1. Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** Argon2id password hashing, server-side sessions stored in
  Postgres (via `connect-pg-simple`), secure `HttpOnly`/`SameSite` cookies
- **Frontend:** Vanilla HTML/CSS/JS (no build step required) — a dark,
  premium, responsive UI served directly by Express
- **Security:** Helmet CSP + security headers, rate limiting, brute-force
  login protection, parameterized SQL everywhere, strict input validation,
  file-upload validation, centralized error handling that never leaks
  stack traces

## 2. Project Structure

```
nes-cod-tracker/
├── backend/
│   ├── controllers/        (logic lives in services/, routes are thin)
│   ├── database/           (pool.js, migrate.js, seed.js)
│   ├── middleware/         (auth, rate limiting, error handling)
│   ├── routes/              (auth, catalog, progress, profile, admin)
│   ├── services/             (userService, catalogService, progressService, adminService)
│   ├── utils/                (validation helpers)
│   └── server.js
├── frontend/
│   ├── css/main.css
│   ├── js/                  (api.js, app.js, gameCard.js, pages/*.js)
│   └── pages/                (index, games, game, weapon, login, register,
│                              tracker, profile, admin)
├── public/assets/camos/      (camo images live here — see its own README)
├── migrations/                (SQL migration files, run in order)
├── seeds/                     (JSON seed data: games, categories, demo weapons)
├── tests/                     (node:test unit tests)
├── .env.example
└── package.json
```

## 3. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local install, Docker, or a managed instance)

## 4. Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
#   - Set DATABASE_URL to your Postgres connection string
#   - Generate a real SESSION_SECRET:
#       node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the database (if it doesn't exist yet)
createdb nes_cod_tracker

# 4. Run migrations
npm run migrate

# 5. Seed reference data (games, categories, demo weapons/challenges)
npm run seed

# 6. Start the app
npm run dev      # with nodemon, auto-restart on changes
# or
npm start        # plain node
```

The app is now running at `http://localhost:3000`.

### Creating your first admin user

The seed script can promote a user to admin if you set these in `.env`
*before* running `npm run seed`:

```
ADMIN_BOOTSTRAP_USERNAME=youradminname
ADMIN_BOOTSTRAP_PASSWORD=a-strong-password
```

Alternatively, register a normal account through the UI, then promote it
manually:

```sql
UPDATE users SET is_admin = TRUE WHERE username_lower = 'youradminname';
```

## 5. Adding Your Own Data

Everything about games, weapons, camo challenges, and mastery categories is
stored in the database — nothing is hard-coded in the frontend. You can:

- **Use the Admin Panel** (`/pages/admin.html`, admin accounts only) to add
  games, weapons, and challenges, and to upload camo images.
- **Edit the seed files** in `seeds/` and re-run `npm run seed` (it's
  idempotent — safe to run repeatedly; it upserts rather than duplicating).
- **Add more games' worth of weapons/challenges** by extending
  `seeds/weapons.json` and `seeds/challenge_templates.json`, or by writing
  additional migration/seed scripts for bulk imports.

Only two games (`mw2019` and `bo6`) ship with demonstration weapon/challenge
data out of the box, using generic, original challenge text (e.g. "Get 30
kills with this weapon") — safe placeholder data structured so you can
replace it with verified, appropriately-licensed challenge text for every
game and weapon. All other games are seeded with their mastery-camo
categories and are ready for weapons to be added via the admin panel.
**Modern Warfare 4** is seeded with `status: "coming_soon"` and intentionally
has no weapons or challenges — the UI shows it as locked automatically.

### Camo Images

Drop images into `public/assets/camos/<game-slug>/<weapon-slug>/` — see
`public/assets/camos/README.md` for the exact structure. Missing images
show an elegant placeholder instead of breaking the page, so you can launch
before every image is ready.

## 6. Database Schema Overview

```
users ─┬─ user_progress ─┬─ camo_challenges ─── weapons ─── games
        │                 └─ mastery_camos ─── mastery_categories ─── games
        └─ user_settings

weapon_categories ─── weapons   (Assault Rifles, SMGs, Shotguns, etc.)
sessions            (managed by connect-pg-simple)
```

- `user_progress` uses a single table with two nullable foreign keys
  (`challenge_id`, `mastery_camo_id`) and a check constraint so exactly one
  is set per row — one clean table covers both challenge types.
- Mastery categories are **configurable per game** (see
  `seeds/mastery_categories.json`) rather than a fixed global list, so each
  game's own progression system (Gold/Platinum/Damascus/Obsidian for
  MW2019, Gold/Diamond/Dark Spine for BO6, etc.) is represented accurately.

## 7. API Overview

All endpoints are under `/api`. Highlights:

```
POST   /api/auth/register            Create account
POST   /api/auth/login               Log in (rate-limited)
POST   /api/auth/logout              Log out
GET    /api/auth/me                  Current session user
POST   /api/auth/change-password
DELETE /api/auth/account             Delete own account

GET    /api/games                    List all games
GET    /api/games/:slug              Game detail + its mastery categories
GET    /api/games/:slug/weapons      Weapons for a game (search/filter/progress)
GET    /api/weapons/:id              Weapon detail: challenges + mastery + your progress
GET    /api/search?q=...             Global search across weapons/mastery camos

GET    /api/progress                 Your full progress summary
POST   /api/progress                 Mark a challenge or mastery camo complete
DELETE /api/progress/challenge/:id   Mark a challenge incomplete
DELETE /api/progress/mastery/:id     Mark a mastery camo incomplete

GET    /api/profile/:username        Public (or own) profile
PATCH  /api/profile/me               Update privacy / favorite game

POST   /api/admin/games              (admin only, server-checked)
PATCH  /api/admin/games/:id
POST   /api/admin/weapons
PATCH  /api/admin/weapons/:id
DELETE /api/admin/weapons/:id
POST   /api/admin/challenges
PATCH  /api/admin/challenges/:id
DELETE /api/admin/challenges/:id
POST   /api/admin/upload-image
GET    /api/admin/reference          Games + categories for building admin forms
```

Every admin route re-checks `is_admin` from a freshly loaded database
record on every request — the frontend's admin UI is a convenience, not a
security boundary.

## 8. Security Notes

- Passwords are hashed with **Argon2id**, never stored in plaintext.
- Sessions are stored server-side in Postgres; the session cookie is
  `HttpOnly`, `SameSite=Lax`, and `Secure` in production. No auth tokens are
  ever placed in `localStorage`.
- Login attempts are rate-limited per IP+username, with automatic temporary
  account lockout after repeated failures.
- All SQL is parameterized — no string-concatenated queries anywhere.
- Helmet sets a strict Content-Security-Policy and standard security
  headers.
- Uploaded images are validated by MIME type, capped in size
  (`MAX_UPLOAD_BYTES`), and written to sanitized, predictable filenames —
  never the client-supplied filename verbatim.
- Errors are logged in full server-side but only a generic message is ever
  sent to the client for 5xx failures — no stack traces leak.
- This project follows current best practices, but no application should
  ever be described as "100% secure." Review the code, keep dependencies
  updated (`npm audit`), and adapt these defaults to your own threat model
  before handling real user data at scale.

## 9. Production Deployment (VPS)

A typical flow:

```
Internet → HTTPS (Nginx) → Node.js (PM2) → PostgreSQL
```

### Steps

1. **Provision PostgreSQL** — either on the same VPS or a managed service.
   Create the database and a dedicated low-privilege application user.

2. **Clone/upload the app** to the server, then:
   ```bash
   npm install --omit=dev
   cp .env.example .env   # fill in real production values
   npm run migrate
   npm run seed            # optional, or seed manually per your data plan
   ```
   In production, set in `.env`:
   ```
   NODE_ENV=production
   COOKIE_SECURE=true
   PGSSL=true              # if your DB requires SSL
   SESSION_SECRET=<generate a unique long random value>
   ```

3. **Run with PM2** for process management and auto-restart:
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name nes-cod-tracker
   pm2 save
   pm2 startup
   ```

4. **Nginx reverse proxy with HTTPS** (example server block):
   ```nginx
   server {
     listen 443 ssl http2;
     server_name your-domain.com;

     ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }

   server {
     listen 80;
     server_name your-domain.com;
     return 301 https://$host$request_uri;
   }
   ```
   Use `certbot` (Let's Encrypt) to obtain the certificate.

5. **Database backups** — schedule regular `pg_dump` backups:
   ```bash
   pg_dump -Fc nes_cod_tracker > backup_$(date +%F).dump
   ```
   Store backups off-server (e.g. object storage) and test restores
   periodically.

6. **Ongoing maintenance**
   - `npm audit` regularly and update dependencies.
   - Watch `pm2 logs nes-cod-tracker` for errors.
   - Run new `migrations/*.sql` files with `npm run migrate` after each
     deploy that changes the schema (the runner tracks applied migrations
     in a `schema_migrations` table, so it's safe to re-run).

## 10. Testing

```bash
npm test
```

Runs unit tests for input-validation utilities (`tests/validate.test.js`)
using Node's built-in test runner. Extend this with integration tests
against a test database as the project grows.

## 11. Known Scope Notes

- Two games (`mw2019`, `bo6`) ship with sample weapons/challenges so the
  full tracking flow works end-to-end out of the box. Every other included
  game (Cold War, Vanguard, MW2, MW3, BO7) is seeded with its mastery-camo
  categories only, ready for weapons/challenges to be added via the admin
  panel or seed files. MW4 is intentionally empty and locked
  (`status: "coming_soon"`).
- Camo images are placeholders by design — supply your own under
  `public/assets/camos/` (see that folder's README).
