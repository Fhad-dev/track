const express = require('express');
const catalogService = require('../services/catalogService');
const { ApiError } = require('../middleware/errorHandler');
const { isUuid, isSlug } = require('../utils/validate');

const router = express.Router();

router.get('/games', async (req, res, next) => {
  try {
    const games = await catalogService.listGames();
    res.json({ games });
  } catch (err) {
    next(err);
  }
});

router.get('/games/:slug', async (req, res, next) => {
  try {
    if (!isSlug(req.params.slug)) throw new ApiError(400, 'Invalid game slug.');
    const game = await catalogService.getGameBySlug(req.params.slug);
    const categories = await catalogService.listWeaponCategories();
    const mastery = await catalogService.listMasteryCategories(game.id);
    res.json({ game, weaponCategories: categories, masteryCategories: mastery });
  } catch (err) {
    next(err);
  }
});

router.get('/games/:slug/weapons', async (req, res, next) => {
  try {
    if (!isSlug(req.params.slug)) throw new ApiError(400, 'Invalid game slug.');
    const userId = req.session && req.session.userId ? req.session.userId : null;
    const { search, category } = req.query;
    const result = await catalogService.listWeaponsForGame(req.params.slug, userId, {
      search: typeof search === 'string' ? search.slice(0, 64) : undefined,
      categoryKey: typeof category === 'string' ? category.slice(0, 32) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/weapons/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid weapon id.');
    const userId = req.session && req.session.userId ? req.session.userId : null;
    const detail = await catalogService.getWeaponDetail(req.params.id, userId);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const term = (req.query.q || '').toString().trim().slice(0, 64);
    if (term.length < 2) return res.json({ weapons: [], masteryMatches: [] });
    const userId = req.session && req.session.userId ? req.session.userId : null;
    const results = await catalogService.searchAll(term, userId);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
