const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const adminService = require('../services/adminService');
const catalogService = require('../services/catalogService');
const { ApiError } = require('../middleware/errorHandler');
const { isUuid, isSlug } = require('../utils/validate');

const router = express.Router();

// Every route below requires a logged-in admin. requireAdmin checks the
// freshly-loaded req.user.is_admin from the DB - never a client-sent flag.
router.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// Image upload (camo images) - strict validation on type/size/filename.
// ---------------------------------------------------------------------------
const ALLOWED_MIME = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/avif']);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 2 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const gameSlug = req.body.gameSlug;
      const weaponSlug = req.body.weaponSlug;
      if (!isSlug(gameSlug) || !isSlug(weaponSlug)) {
        return cb(new ApiError(400, 'gameSlug and weaponSlug must be valid slugs.'));
      }
      const dir = path.join(__dirname, '..', '..', 'public', 'assets', 'camos', gameSlug, weaponSlug);
      require('fs').mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = { 'image/webp': '.webp', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/avif': '.avif' }[file.mimetype] || '';
      const safeBase = (req.body.filename || crypto.randomBytes(8).toString('hex')).replace(/[^a-z0-9-_]/gi, '');
      cb(null, `${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(400, 'Unsupported image type. Use WebP, PNG, JPEG, or AVIF.'));
    }
    cb(null, true);
  },
});

router.post('/upload-image', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return next(err instanceof ApiError ? err : new ApiError(400, err.message));
    if (!req.file) return next(new ApiError(400, 'No image uploaded.'));
    const relativePath = `/assets/camos/${req.body.gameSlug}/${req.body.weaponSlug}/${req.file.filename}`;
    res.status(201).json({ path: relativePath });
  });
});

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------
router.post('/games', async (req, res, next) => {
  try {
    const game = await adminService.createGame(req.body || {});
    res.status(201).json({ game });
  } catch (err) {
    next(err);
  }
});

router.patch('/games/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid id.');
    const game = await adminService.updateGame(req.params.id, req.body || {});
    res.json({ game });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------
router.post('/weapons', async (req, res, next) => {
  try {
    const weapon = await adminService.createWeapon(req.body || {});
    res.status(201).json({ weapon });
  } catch (err) {
    next(err);
  }
});

router.patch('/weapons/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid id.');
    const weapon = await adminService.updateWeapon(req.params.id, req.body || {});
    res.json({ weapon });
  } catch (err) {
    next(err);
  }
});

router.delete('/weapons/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid id.');
    await adminService.deleteWeapon(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------
router.post('/challenges', async (req, res, next) => {
  try {
    const challenge = await adminService.createChallenge(req.body || {});
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
});

router.patch('/challenges/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid id.');
    const challenge = await adminService.updateChallenge(req.params.id, req.body || {});
    res.json({ challenge });
  } catch (err) {
    next(err);
  }
});

router.delete('/challenges/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid id.');
    await adminService.deleteChallenge(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Reference data for building admin forms
// ---------------------------------------------------------------------------
router.get('/reference', async (req, res, next) => {
  try {
    const games = await catalogService.listGames();
    const weaponCategories = await catalogService.listWeaponCategories();
    res.json({ games, weaponCategories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
