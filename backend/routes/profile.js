const express = require('express');
const userService = require('../services/userService');
const progressService = require('../services/progressService');
const { requireAuth } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const { isValidUsername } = require('../utils/validate');

const router = express.Router();

// Update own profile settings (privacy toggle, favorite game)
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { isPublic, favoriteGameSlug } = req.body || {};
    const user = await userService.updateProfileSettings(req.session.userId, {
      isPublic: typeof isPublic === 'boolean' ? isPublic : null,
      favoriteGameSlug: favoriteGameSlug || null,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// View a profile by username. Only public profiles are visible to others;
// a user can always view their own.
router.get('/:username', async (req, res, next) => {
  try {
    if (!isValidUsername(req.params.username)) throw new ApiError(400, 'Invalid username.');
    const user = await userService.findByUsername(req.params.username);
    if (!user) throw new ApiError(404, 'Profile not found.');

    const isOwner = req.session && req.session.userId === user.id;
    if (!user.is_public && !isOwner) {
      throw new ApiError(403, 'This profile is private.');
    }

    const summary = await progressService.getUserProgressSummary(user.id);

    // Strict allowlist - never leak password, email, timestamps of
    // account security events, etc.
    res.json({
      profile: {
        username: user.username,
        favoriteGameSlug: user.favorite_game_slug,
        isPublic: user.is_public,
        isOwner,
        overallPercent: summary.overallPercent,
        gamesCompletedCount: summary.gamesCompletedCount,
        gamesTotalCount: summary.gamesTotalCount,
        weaponsCompleted: summary.weaponsCompleted,
        perGame: summary.perGame,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
